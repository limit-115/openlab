/**
 * jsdom answers every media query with a frozen `matches: false` and never emits a change, so a
 * preference that follows the machine cannot be exercised against it. This one can be flipped, and
 * tells the listeners the way the browser would.
 */
export class FakeMediaQuery {
    matches: boolean;
    private readonly listeners = new Set<() => void>();

    constructor(matches = false) {
        this.matches = matches;
    }

    addEventListener(_type: string, listener: () => void): void {
        this.listeners.add(listener);
    }

    removeEventListener(_type: string, listener: () => void): void {
        this.listeners.delete(listener);
    }

    /** Flips the machine's preference and announces it the way the browser does. */
    flipTo(matches: boolean): void {
        this.matches = matches;

        for (const listener of this.listeners) {
            listener();
        }
    }
}
