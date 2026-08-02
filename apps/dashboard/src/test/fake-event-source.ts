import {
    StreamEventType,
    type StreamEventType as StreamEventTypeValue
} from "#src/api/stream-constants";

export class FakeEventSource {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    static instances: FakeEventSource[] = [];

    readonly url: string;
    readyState = FakeEventSource.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    private readonly listeners = new Map<string, Set<(event: Event) => void>>();

    constructor(url: string | URL) {
        this.url = url.toString();
        FakeEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: (event: Event) => void): void {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type: string, listener: (event: Event) => void): void {
        this.listeners.get(type)?.delete(listener);
    }

    close(): void {
        this.readyState = FakeEventSource.CLOSED;
    }

    open(): void {
        this.readyState = FakeEventSource.OPEN;
        this.onopen?.(new Event("open"));
    }

    fail(permanently = false): void {
        this.readyState = permanently ? FakeEventSource.CLOSED : FakeEventSource.CONNECTING;
        this.onerror?.(new Event("error"));
    }

    emit(type: StreamEventTypeValue, payload: unknown): void {
        const event = new MessageEvent(type, { data: JSON.stringify(payload) });

        if (type === StreamEventType.MESSAGE) {
            this.onmessage?.(event);
        }
        for (const listener of this.listeners.get(type) ?? []) {
            listener(event);
        }
    }

    static reset(): void {
        FakeEventSource.instances = [];
    }
}
