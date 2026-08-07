/**
 * A vendor that has stopped serving the account ends the run with a plain sentence on its error
 * channel instead of a protocol signal. Each CLI words the refusal differently, so it is recognised
 * by the vocabulary the vendors share: an exhausted limit, a throttle, or an empty prepaid balance.
 * The last of those is why this is not called a subscription limit — a wallet billed by the token
 * runs out in exactly the same place, and says so in the same channel.
 */
export const SPENT_ALLOWANCE_PATTERNS: readonly RegExp[] = [
    /usage limit/iu,
    /rate[\s_-]?limit/iu,
    /quota/iu,
    /too many requests/iu,
    /\b(?:out of|insufficient|purchase more) credits?\b/iu
];
