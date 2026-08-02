import { type HarnessKind, HarnessKinds } from "@lab/harness/agent-harness.const";
import { InvalidArgumentError } from "commander";

const HARNESS_KIND_SEPARATOR = ",";

const selectableHarnessKinds: readonly HarnessKind[] = Object.values(HarnessKinds);

/** Names every harness an operator may put in a roster, in the order the help text lists them. */
export function harnessKindList(): string {
    return selectableHarnessKinds.join(`${HARNESS_KIND_SEPARATOR} `);
}

/**
 * Collects `--harness` into the roster a run rotates through, keeping the order it was written in,
 * because that order decides which harness each stage of a cycle lands on. Repeating the flag
 * appends, so `--harness glm --harness codex` and `--harness glm,codex` mean the same thing.
 */
export function parseHarnessKinds(
    value: string,
    previous: readonly HarnessKind[] | undefined
): readonly HarnessKind[] {
    const named = value
        .split(HARNESS_KIND_SEPARATOR)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    if (named.length === 0) {
        throw new InvalidArgumentError(`Name at least one harness: ${harnessKindList()}`);
    }

    const roster = [...(previous ?? [])];
    for (const entry of named) {
        const kind = selectableHarnessKinds.find((candidate) => candidate === entry);
        if (kind === undefined) {
            throw new InvalidArgumentError(
                `Unknown harness "${entry}". Choose from ${harnessKindList()}`
            );
        }
        if (roster.includes(kind)) {
            throw new InvalidArgumentError(
                `Harness "${kind}" is named twice, which would give it a double share of the rotation`
            );
        }
        roster.push(kind);
    }
    return roster;
}
