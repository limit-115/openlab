import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { FakeResizeObserver } from "#src/test-support/fake-resize-observer";

globalThis.ResizeObserver = FakeResizeObserver;

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
