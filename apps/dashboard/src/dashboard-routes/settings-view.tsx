import { SETTINGS_PAGE } from "#src/dashboard-routes/settings-view.const";
import { HarnessSettingsSection } from "#src/harness-settings/harness-settings-section";
import { LabStorageSection } from "#src/lab-maintenance/lab-storage-section";
import { SubscriptionAllowanceSection } from "#src/subscription-allowance/subscription-allowance-section";

/**
 * What the operator reads and sets for the lab itself rather than for one investigation. Each
 * concern is a block of its own, and a block owns the readings it shows, so the page composes them
 * without knowing what any of them talks to.
 */
export function SettingsView() {
    return (
        <div className={SETTINGS_PAGE}>
            <HarnessSettingsSection />
            <SubscriptionAllowanceSection />
            <LabStorageSection />
        </div>
    );
}
