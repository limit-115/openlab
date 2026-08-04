import {
    SETTINGS_PAGE,
    SETTINGS_SECTIONS,
    SettingsSection
} from "#src/dashboard-routes/settings-view.const";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#src/design-system/tabs";
import { HarnessSettingsSection } from "#src/harness-settings/harness-settings-section";
import { LabStorageSection } from "#src/lab-maintenance/lab-storage-section";
import { SubscriptionAllowanceSection } from "#src/subscription-allowance/subscription-allowance-section";

/**
 * What the operator reads and sets for the lab itself rather than for one investigation. The
 * concerns have nothing to do with each other, so each one is a tab of its own, and a tab owns the
 * readings it shows: the page composes them without knowing what any of them talks to.
 */
export function SettingsView() {
    return (
        <Tabs defaultValue={SettingsSection.HARNESSES} className={SETTINGS_PAGE}>
            <TabsList>
                {SETTINGS_SECTIONS.map((section) => (
                    <TabsTrigger key={section.section} value={section.section}>
                        {section.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value={SettingsSection.HARNESSES}>
                <HarnessSettingsSection />
            </TabsContent>
            <TabsContent value={SettingsSection.SUBSCRIPTIONS}>
                <SubscriptionAllowanceSection />
            </TabsContent>
            <TabsContent value={SettingsSection.STORAGE}>
                <LabStorageSection />
            </TabsContent>
        </Tabs>
    );
}
