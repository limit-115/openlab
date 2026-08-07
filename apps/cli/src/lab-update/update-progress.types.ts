import type { UpdateStep } from "#src/lab-update/update-progress.const";

/**
 * One thing an update is doing, with what it needs to be said in full.
 *
 * Each step carries its own facts rather than a sentence, so the phrasing stays where the operator
 * is being spoken to and nothing here has to guess at a terminal's width or its taste in units.
 */
export type UpdateProgress =
    | { readonly step: typeof UpdateStep.ASKING; readonly channel: string }
    | {
          readonly step: typeof UpdateStep.DOWNLOADING;
          readonly file: string;
          readonly received: number;
          readonly total: number;
      }
    | { readonly step: typeof UpdateStep.UNPACKING; readonly file: string }
    | { readonly step: typeof UpdateStep.INSTALLING; readonly versionDirectory: string };

/** How an update says what it is doing. Saying nothing is what a script gets. */
export type ReportUpdate = (progress: UpdateProgress) => void;
