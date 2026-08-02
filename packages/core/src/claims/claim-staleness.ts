import type { ClaimDependency } from "#src/claims/claim-staleness.types";

export function collectStaleDependents(
    refutedAssumptionIds: ReadonlySet<string>,
    dependencies: readonly ClaimDependency[]
): ReadonlySet<string> {
    const stale = new Set(refutedAssumptionIds);
    let changed = true;

    while (changed) {
        changed = false;
        for (const dependency of dependencies) {
            if (
                !stale.has(dependency.claimId) &&
                dependency.dependencyIds.some((dependencyId) => stale.has(dependencyId))
            ) {
                stale.add(dependency.claimId);
                changed = true;
            }
        }
    }

    for (const refutedId of refutedAssumptionIds) {
        stale.delete(refutedId);
    }

    return stale;
}
