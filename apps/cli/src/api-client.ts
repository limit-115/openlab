import type { Assumption } from "@openlab/protocol/assumptions/assumption.types";
import type { CapabilityRequest } from "@openlab/protocol/capabilities/capability-request.types";
import type { InvestigationRequest } from "@openlab/protocol/investigation-input/investigation-input.types";
import type { InvestigationSummary } from "@openlab/protocol/investigation-status/investigation-summary.types";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";

export class LabApiError extends Error {
    readonly status: number;
    readonly details: unknown;

    constructor(message: string, status: number, details: unknown) {
        super(message);
        this.name = "LabApiError";
        this.status = status;
        this.details = details;
    }
}

export class LabApiClient {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    investigations(): Promise<InvestigationSummary[]> {
        return this.request<InvestigationSummary[]>("/api/investigations");
    }

    create(request: InvestigationRequest): Promise<StatusSnapshot> {
        return this.request<StatusSnapshot>("/api/investigations", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(request)
        });
    }

    remove(investigationId: string): Promise<void> {
        return this.request<void>(this.investigationPath(investigationId), { method: "DELETE" });
    }

    status(investigationId: string): Promise<StatusSnapshot> {
        return this.request<StatusSnapshot>(`${this.investigationPath(investigationId)}/status`);
    }

    assumptions(investigationId: string): Promise<Assumption[]> {
        return this.request<Assumption[]>(`${this.investigationPath(investigationId)}/assumptions`);
    }

    inspect(investigationId: string, entityId: string): Promise<unknown> {
        return this.request(
            `${this.investigationPath(investigationId)}/inspect/${encodeURIComponent(entityId)}`
        );
    }

    capabilities(investigationId: string): Promise<CapabilityRequest[]> {
        return this.request<CapabilityRequest[]>(
            `${this.investigationPath(investigationId)}/capabilities`
        );
    }

    wake(investigationId: string): Promise<StatusSnapshot> {
        return this.request<StatusSnapshot>(`${this.investigationPath(investigationId)}/wake`, {
            method: "POST"
        });
    }

    stop(investigationId: string): Promise<StatusSnapshot> {
        return this.request<StatusSnapshot>(`${this.investigationPath(investigationId)}/stop`, {
            method: "POST"
        });
    }

    answer(
        investigationId: string,
        capabilityId: string,
        answer: string
    ): Promise<{ accepted: boolean }> {
        return this.request(
            `${this.investigationPath(investigationId)}/capabilities/${encodeURIComponent(capabilityId)}/answer`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ answer })
            }
        );
    }

    exportRun(
        investigationId: string
    ): Promise<{ investigation_id: string; run_directory: string; files: string[] }> {
        return this.request(`${this.investigationPath(investigationId)}/export`);
    }

    private investigationPath(investigationId: string): string {
        return `/api/investigations/${encodeURIComponent(investigationId)}`;
    }

    private async request<T>(pathname: string, init?: RequestInit): Promise<T> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}${pathname}`, {
                ...init,
                signal: AbortSignal.timeout(10_000)
            });
        } catch (error) {
            throw new LabApiError(`Cannot reach the lab daemon at ${this.baseUrl}`, 0, error);
        }

        const contentType = response.headers.get("content-type");
        const body = contentType?.includes("application/json")
            ? await response.json()
            : await response.text();
        if (!response.ok) {
            const message =
                typeof body === "object" && body !== null && "error" in body
                    ? String(body.error)
                    : `Lab API returned ${response.status}`;
            throw new LabApiError(message, response.status, body);
        }
        return body as T;
    }
}
