/**
 * jsdom has no layout engine and so no ResizeObserver. Anything that watches its own content grow -
 * the agent transcript following a live stream - constructs one while it renders, so the tests need
 * the constructor to exist. It reports nothing, because a document without layout never resizes.
 */
export class FakeResizeObserver implements ResizeObserver {
    observe(): void {}

    unobserve(): void {}

    disconnect(): void {}
}
