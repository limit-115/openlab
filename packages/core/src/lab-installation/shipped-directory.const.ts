/**
 * What a released lab lays out beside its executable.
 *
 * A release is one compiled binary and the files it reads at runtime but cannot hold inside itself:
 * the dashboard it serves and the migrations it brings a database up on. Both are directories of
 * many files that the code reading them walks rather than opens by name, so they travel beside the
 * executable instead of inside it.
 */
export const ShippedDirectory = {
    DASHBOARD: "dashboard",
    MIGRATIONS: "migrations"
} as const;

export type ShippedDirectory = (typeof ShippedDirectory)[keyof typeof ShippedDirectory];
