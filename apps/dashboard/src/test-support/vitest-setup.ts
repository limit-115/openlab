import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { fakeMatchMedia } from "#src/test-support/fake-match-media";
import { installFakePointerCapture } from "#src/test-support/fake-pointer-capture";
import { FakeResizeObserver } from "#src/test-support/fake-resize-observer";
// The interface reads its words off the initialised instance, so every render needs it standing.
import "#src/interface-language/interface-language";

globalThis.ResizeObserver = FakeResizeObserver;
window.matchMedia = fakeMatchMedia;
installFakePointerCapture();

/**
 * Nothing reaches a network from a test.
 *
 * A page is more than the thing a test is looking at — the shell around it asks the lab about the
 * roster, its storage, its release — so a test that stubs only what it reads still lets the rest
 * go out to a socket, where it waits for a timeout that has nothing to do with what failed. Every
 * request that no test answered is refused here, at once, and a test that cares stubs `fetch` for
 * itself the way it always did.
 */
globalThis.fetch = (async (input: RequestInfo | URL) => {
    throw new Error(`No test answered ${String(input)}`);
}) as typeof fetch;

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
