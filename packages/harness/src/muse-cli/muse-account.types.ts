/** Who Muse Code is signed in as, read from the credential its own login wrote. */
export interface MuseAccount {
    /** Absent when the credential is a pasted API key rather than a Meta-account login. */
    readonly email: string | null;
    readonly mechanism: string;
    /** The host the stored credential itself points at, which is what the run will talk to. */
    readonly baseUrl: string;
}

export type ResolveMuseAccount = (environment: Readonly<NodeJS.ProcessEnv>) => Promise<MuseAccount>;
