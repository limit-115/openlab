/**
 * A subscription tier as the page writes it. The vendors report their own tiers in whatever case
 * their API happens to use — `max`, `pro` — and beside a capitalised harness name that reads as a
 * different kind of thing rather than as the name of a plan.
 *
 * Only the first letter is raised. A vendor that names a tier in full, such as `ChatGPT Pro`, has
 * already said how it is spelled, and title-casing it would rewrite the vendor's own product name.
 */
export function subscriptionPlanName(plan: string): string {
    return plan.replace(/^./u, (first) => first.toUpperCase());
}
