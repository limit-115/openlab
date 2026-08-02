/** A credential proven to draw on a GLM Coding Plan subscription rather than a prepaid wallet. */
export interface ZaiCodingPlan {
    readonly apiKey: string;
    readonly level: string;
}

export type ResolveZaiCodingPlan = () => Promise<ZaiCodingPlan>;
