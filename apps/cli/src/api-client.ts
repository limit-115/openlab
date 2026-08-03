import type { Assumption } from "@lab/protocol/assumptions/assumption.types";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";

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

    status(): Promise<StatusSnapshot> {
        return this.request<StatusSnapshot>("/api/status");
    }

    assumptions(): Promise<Assumption[]> {
        return this.request<Assumption[]>("/api/assumptions");
    }

    inspect(id: string): Promise<unknown> {
        return this.request(`/api/inspect/${encodeURIComponent(id)}`);
    }

    capabilities(): Promise<CapabilityRequest[]> {
        return this.request<CapabilityRequest[]>("/api/capabilities");
    }

    wake(): Promise<StatusSnapshot> {
        return this.request<StatusSnapshot>("/api/wake", { method: "POST" });
    }

    stop(): Promise<StatusSnapshot> {
        return this.request<StatusSnapshot>("/api/stop", { method: "POST" });
    }

    answer(id: string, answer: string): Promise<{ accepted: boolean }> {
        return this.request(`/api/capabilities/${encodeURIComponent(id)}/answer`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ answer })
        });
    }

    exportRun(): Promise<{ lab_id: string; run_directory: string; files: string[] }> {
        return this.request("/api/export");
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
