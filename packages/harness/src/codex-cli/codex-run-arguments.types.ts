/**
 * One endpoint the Codex CLI may be pointed at. `envKey` names the variable the CLI reads the
 * credential from, so the credential itself never becomes an argument.
 */
export interface CodexModelProvider {
    readonly id: string;
    readonly name: string;
    readonly baseUrl: string;
    readonly wireApi: string;
    readonly envKey: string;
}
