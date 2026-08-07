/**
 * Something an update could not go on from, in the terms an operator can act on.
 *
 * These are the ordinary failures of reaching a network and reading what came back, not defects of
 * the lab, so they reach the terminal as a sentence and not as a stack trace.
 */
export class UpdateError extends Error {}
