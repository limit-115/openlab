import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluateModelApiCommand } from "@lab/harness/model-api-policy";
import { ModelApiPolicyDecision } from "@lab/harness/model-api-policy.const";
import type { ValidatedArtifact } from "#src/artifact-integrity/file-artifact";
import { validateFileArtifact } from "#src/artifact-integrity/file-artifact";
import {
    SourceFetchLimits,
    SourceFetchOutcome,
    type SourceFetchOutcome as SourceFetchOutcomeValue,
    type SourceFetchRequest,
    type SourceFetchResult
} from "#src/source-integrity/source-fetch.contract";

const SourceFetchArtifactFile = {
    BODY: "body.bin",
    MANIFEST: "fetch.json"
} as const;

const SourceFetchHttpMethod = {
    GET: "GET"
} as const;

const SourceFetchProtocol = {
    HTTP: "http:",
    HTTPS: "https:"
} as const;

const SourceRedirectStatus = {
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308
} as const;

const redirectStatuses: ReadonlySet<number> = new Set(Object.values(SourceRedirectStatus));

const SensitiveQueryParameterPattern =
    /(?:api[_-]?key|access[_-]?token|auth[_-]?token|credential|password|secret)/iu;

interface SourceFetchManifest {
    readonly outcome: SourceFetchOutcomeValue;
    readonly requested_url: string;
    readonly final_url?: string;
    readonly http_status?: number;
    readonly fetched_at: string;
    readonly body?: ValidatedArtifact;
    readonly error?: string;
}

export async function fetchDaemonSource(request: SourceFetchRequest): Promise<SourceFetchResult> {
    const fetchedAt = new Date().toISOString();
    await mkdir(request.artifactDirectory, { recursive: true, mode: 0o700 });
    const safeRequestedUrl = safeUrlForRecord(request.url);
    let finalUrl: string | undefined;
    let httpStatus: number | undefined;

    try {
        const timeoutSignal = AbortSignal.timeout(SourceFetchLimits.TIMEOUT_MILLISECONDS);
        const signal =
            request.signal === undefined
                ? timeoutSignal
                : AbortSignal.any([request.signal, timeoutSignal]);
        let currentUrl = parseAllowedSourceUrl(request.url);
        for (
            let redirectCount = 0;
            redirectCount <= SourceFetchLimits.MAXIMUM_REDIRECTS;
            redirectCount += 1
        ) {
            finalUrl = currentUrl.toString();
            const response = await fetch(currentUrl, {
                method: SourceFetchHttpMethod.GET,
                redirect: "manual",
                signal
            });
            httpStatus = response.status;
            if (redirectStatuses.has(response.status)) {
                if (redirectCount === SourceFetchLimits.MAXIMUM_REDIRECTS) {
                    throw new Error("Source fetch exceeded the redirect limit");
                }
                const location = response.headers.get("location");
                if (location === null) {
                    throw new Error("Source redirect did not include a location");
                }
                currentUrl = parseAllowedSourceUrl(new URL(location, currentUrl).toString());
                continue;
            }
            if (!response.ok) {
                throw new Error(`Source fetch returned HTTP ${response.status}`);
            }
            const bodyBytes = await readLimitedBody(response);
            const bodyPath = path.join(request.artifactDirectory, SourceFetchArtifactFile.BODY);
            await writeFile(bodyPath, bodyBytes, { flag: "wx", mode: 0o400 });
            const body = await validateFileArtifact(request.artifactRoot, bodyPath);
            const manifest = await persistManifest(request, {
                outcome: SourceFetchOutcome.SUCCEEDED,
                requested_url: safeRequestedUrl,
                final_url: finalUrl,
                http_status: response.status,
                fetched_at: fetchedAt,
                body
            });
            return {
                outcome: SourceFetchOutcome.SUCCEEDED,
                requestedUrl: safeRequestedUrl,
                finalUrl,
                httpStatus: response.status,
                fetchedAt,
                body,
                manifest
            };
        }
        throw new Error("Source fetch exhausted redirects");
    } catch (error) {
        const message = sourceFetchErrorMessage(error, request.signal);
        const manifest = await persistManifest(request, {
            outcome: SourceFetchOutcome.REJECTED,
            requested_url: safeRequestedUrl,
            ...(finalUrl === undefined ? {} : { final_url: finalUrl }),
            ...(httpStatus === undefined ? {} : { http_status: httpStatus }),
            fetched_at: fetchedAt,
            error: message
        });
        return {
            outcome: SourceFetchOutcome.REJECTED,
            requestedUrl: safeRequestedUrl,
            ...(finalUrl === undefined ? {} : { finalUrl }),
            ...(httpStatus === undefined ? {} : { httpStatus }),
            fetchedAt,
            error: message,
            manifest
        };
    }
}

function parseAllowedSourceUrl(value: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error("Source URL is invalid");
    }
    if (url.protocol !== SourceFetchProtocol.HTTP && url.protocol !== SourceFetchProtocol.HTTPS) {
        throw new Error("Source URL must use http or https");
    }
    if (url.username.length > 0 || url.password.length > 0) {
        throw new Error("Source URL must not contain credentials");
    }
    if ([...url.searchParams.keys()].some((name) => SensitiveQueryParameterPattern.test(name))) {
        throw new Error("Source URL must not contain credential query parameters");
    }
    const policy = evaluateModelApiCommand("fetch", [url.toString()]);
    if (policy.decision === ModelApiPolicyDecision.DENY) {
        throw new Error(
            `Source URL violates the model-provider policy: ${policy.reason ?? "denied"}`
        );
    }
    return url;
}

async function readLimitedBody(response: Response): Promise<Uint8Array> {
    const contentLength = response.headers.get("content-length");
    if (
        contentLength !== null &&
        Number.isFinite(Number(contentLength)) &&
        Number(contentLength) > SourceFetchLimits.MAXIMUM_BODY_BYTES
    ) {
        throw new Error("Source response exceeds the body size limit");
    }
    if (response.body === null) {
        return new Uint8Array();
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
        for (;;) {
            const chunk = await reader.read();
            if (chunk.done) {
                break;
            }
            totalBytes += chunk.value.byteLength;
            if (totalBytes > SourceFetchLimits.MAXIMUM_BODY_BYTES) {
                await reader.cancel("Source response exceeds the body size limit");
                throw new Error("Source response exceeds the body size limit");
            }
            chunks.push(chunk.value);
        }
    } finally {
        reader.releaseLock();
    }
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return body;
}

async function persistManifest(
    request: SourceFetchRequest,
    manifest: SourceFetchManifest
): Promise<ValidatedArtifact> {
    const manifestPath = path.join(request.artifactDirectory, SourceFetchArtifactFile.MANIFEST);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`, {
        flag: "wx",
        mode: 0o400
    });
    return validateFileArtifact(request.artifactRoot, manifestPath);
}

function safeUrlForRecord(value: string): string {
    try {
        const url = new URL(value);
        if (
            evaluateModelApiCommand("fetch", [url.toString()]).decision ===
            ModelApiPolicyDecision.DENY
        ) {
            return "[rejected-by-model-provider-policy]";
        }
        url.username = "";
        url.password = "";
        for (const name of [...url.searchParams.keys()]) {
            if (SensitiveQueryParameterPattern.test(name)) {
                url.searchParams.set(name, "[redacted]");
            }
        }
        return url.toString();
    } catch {
        return "[invalid-url]";
    }
}

function sourceFetchErrorMessage(error: unknown, callerSignal: AbortSignal | undefined): string {
    if (callerSignal?.aborted) {
        return "Source fetch was cancelled";
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
        return "Source fetch timed out";
    }
    return error instanceof Error ? error.message : String(error);
}
