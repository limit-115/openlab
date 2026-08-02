export function domainValues<const Domain extends Readonly<Record<string, string>>>(
    domain: Domain
): [Domain[keyof Domain], ...Domain[keyof Domain][]] {
    const values = Object.values(domain) as Domain[keyof Domain][];
    const first = values[0];
    if (first === undefined) {
        throw new Error("A finite domain must contain at least one value");
    }
    return [first, ...values.slice(1)];
}
