/**
 * A precommitted evaluator is written by an agent that afterwards runs unrestricted, so freezing it
 * means taking it out of that agent's workspace entirely rather than trusting the file to sit still.
 */
export const FrozenEvaluatorStore = {
    DIRECTORY: "frozen-evaluators",
    FILE_NAME: "evaluator",
    FILE_MODE: 0o500
} as const;
