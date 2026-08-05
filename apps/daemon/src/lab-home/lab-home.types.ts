/** The two variables that can decide where a lab lives. */
export interface LabHomeEnvironment {
    readonly OPENLAB_HOME?: string | undefined;
    readonly XDG_DATA_HOME?: string | undefined;
}
