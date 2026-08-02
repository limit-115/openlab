/**
 * A vendor that has served the whole subscription allowance ends the run with a plain sentence on
 * its error channel instead of a protocol signal. Each CLI words the refusal differently, so a spent
 * allowance is recognised by the vocabulary the vendors share: an exhausted limit, a throttle, or an
 * empty prepaid balance.
 */
export const SUBSCRIPTION_USAGE_LIMIT_PATTERNS: readonly RegExp[] = [
    /usage limit/iu,
    /rate[\s_-]?limit/iu,
    /quota/iu,
    /too many requests/iu,
    /\b(?:out of|insufficient|purchase more) credits?\b/iu
];
