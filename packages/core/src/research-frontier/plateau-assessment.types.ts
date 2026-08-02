export interface PlateauAssessment {
    readonly plateau: boolean;
    readonly reasons: readonly string[];
    readonly latestProgressAt?: Date;
}
