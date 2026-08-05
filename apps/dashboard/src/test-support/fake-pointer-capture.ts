/**
 * jsdom implements no pointer capture and no scrolling, so an element never answers whether it holds
 * a pointer. A menu that opens on pointer-down asks that on the way up and throws when the answer is
 * missing, which fails the test for the environment rather than for the behaviour. Nothing is ever
 * captured here, and a scroll into view is a document without layout doing nothing.
 */
export function installFakePointerCapture(): void {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
}
