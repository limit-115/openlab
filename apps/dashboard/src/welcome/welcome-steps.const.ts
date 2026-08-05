/** Where the lab opens for anyone it has not been shown to yet. */
export const WELCOME_ROUTE = "/welcome" as const;

/**
 * The introduction in order. Every step is its own address, because setting a lab up means leaving
 * for a terminal and coming back: the operator lands where they left, and the browser's own back
 * button walks the wizard rather than dropping them out of it.
 */
export const WelcomeStep = {
    LAB: WELCOME_ROUTE,
    HARNESSES: `${WELCOME_ROUTE}/harnesses`,
    NOTIFICATIONS: `${WELCOME_ROUTE}/notifications`,
    GOAL: `${WELCOME_ROUTE}/goal`
} as const;
export type WelcomeStep = (typeof WelcomeStep)[keyof typeof WelcomeStep];

export const WELCOME_STEPS: readonly WelcomeStep[] = Object.values(WelcomeStep);
