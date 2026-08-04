import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { fakeMatchMedia } from "#src/test-support/fake-match-media";
import { FakeResizeObserver } from "#src/test-support/fake-resize-observer";

globalThis.ResizeObserver = FakeResizeObserver;
window.matchMedia = fakeMatchMedia;

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
