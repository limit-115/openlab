import type { ReleaseNotice } from "@openlab/protocol/release-notice/release-notice.types";
import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import type { HarnessAllowanceReadings } from "#src/harness-allowance/harness-allowance-readings";
import type { HarnessReadinessChecks } from "#src/harness-readiness/harness-readiness-checks";
import type { LabSettingsStore } from "#src/lab-settings/lab-settings-store";
import type { NotificationDispatch } from "#src/operator-notifications/notification-dispatch";
import type { NotificationSettingsStore } from "#src/operator-notifications/notification-settings-store";

/**
 * Who the lab reports to, and the thing that does the reporting. They arrive together because the
 * page that sets one is the page that tries the other out.
 */
export interface NotificationServerOptions {
    readonly settings: NotificationSettingsStore;
    readonly dispatch: NotificationDispatch;
}

export interface StatusServerOptions {
    /** The allowances are the lab's, not one investigation's, so the readings are shared. */
    allowances?: HarnessAllowanceReadings;
    /** Whether the CLIs on this machine can run. Without it the lab cannot be set up from a page. */
    harnesses?: HarnessReadinessChecks;
    /** What the operator set for the lab. Without it the lab answers on its shipped defaults. */
    settings?: LabSettingsStore;
    /** Who the lab tells about its moments. Without it the lab reports to nobody and says so. */
    notifications?: NotificationServerOptions;
    /** Where the run directories live. Without it the lab does not report or purge its disk. */
    workspaceRoot?: string;
    /**
     * What this lab is, and what the channel had when whoever started it last looked. The lab is
     * told rather than looking: which release is installed is the program's business, and a lab
     * that was started from its sources has no installation to be behind.
     */
    release?: ReleaseOnThisMachine;
    dashboardRoot?: string;
    logLevel?: DaemonLogLevel;
}

/** What is running here, and what is published, as the caller that started the lab knows it. */
export interface ReleaseOnThisMachine {
    readonly runningVersion: string;
    /** Read whenever the question is asked, because the answer arrives after the lab is up. */
    readonly newer: () => ReleaseNotice | undefined;
}
