import {
    ASSUMPTIONS_EN,
    ASSUMPTIONS_NAMESPACE,
    ASSUMPTIONS_RU
} from "#src/assumptions/assumptions.i18n";
import {
    BREAKTHROUGH_EN,
    BREAKTHROUGH_NAMESPACE,
    BREAKTHROUGH_RU
} from "#src/breakthrough/breakthrough-banner.i18n";
import {
    CAPABILITIES_EN,
    CAPABILITIES_NAMESPACE,
    CAPABILITIES_RU
} from "#src/capabilities/capabilities.i18n";
import {
    INTERFACE_LANGUAGE_EN,
    INTERFACE_LANGUAGE_NAMESPACE,
    INTERFACE_LANGUAGE_RU
} from "#src/interface-language/interface-language.i18n";
import {
    INVESTIGATION_CONTROL_EN,
    INVESTIGATION_CONTROL_NAMESPACE,
    INVESTIGATION_CONTROL_RU
} from "#src/investigation-control/investigation-control.i18n";
import {
    INVESTIGATION_HEADER_EN,
    INVESTIGATION_HEADER_NAMESPACE,
    INVESTIGATION_HEADER_RU
} from "#src/investigation-header/investigation-header.i18n";
import {
    OUTCOME_PANEL_EN,
    OUTCOME_PANEL_NAMESPACE,
    OUTCOME_PANEL_RU
} from "#src/investigation-outcome/outcome-panel.i18n";
import {
    INVESTIGATION_ROSTER_EN,
    INVESTIGATION_ROSTER_NAMESPACE,
    INVESTIGATION_ROSTER_RU
} from "#src/investigation-roster/investigation-roster.i18n";
import {
    INVESTIGATION_SHELL_EN,
    INVESTIGATION_SHELL_NAMESPACE,
    INVESTIGATION_SHELL_RU
} from "#src/investigation-shell/investigation-shell.i18n";
import {
    INVESTIGATION_STATE_EN,
    INVESTIGATION_STATE_NAMESPACE,
    INVESTIGATION_STATE_RU
} from "#src/investigation-state/investigation-state.i18n";
import {
    LAB_LAYOUT_EN,
    LAB_LAYOUT_NAMESPACE,
    LAB_LAYOUT_RU
} from "#src/lab-layout/lab-layout.i18n";
import {
    MISSION_OVERVIEW_EN,
    MISSION_OVERVIEW_NAMESPACE,
    MISSION_OVERVIEW_RU
} from "#src/mission-overview/mission-overview.i18n";
import {
    STATUS_TAG_EN,
    STATUS_TAG_NAMESPACE,
    STATUS_TAG_RU
} from "#src/status-tag/status-tag.i18n";
import { THEME_EN, THEME_NAMESPACE, THEME_RU } from "#src/theme/theme.i18n";

/**
 * Every feature keeps its own words beside the code that renders them, under a namespace named
 * after the feature. This is the one place that knows the whole vocabulary, because i18next has to
 * be handed a single object per language, and it is a list of features rather than a store of copy.
 */
export const EN_TRANSLATIONS = {
    [ASSUMPTIONS_NAMESPACE]: ASSUMPTIONS_EN,
    [BREAKTHROUGH_NAMESPACE]: BREAKTHROUGH_EN,
    [CAPABILITIES_NAMESPACE]: CAPABILITIES_EN,
    [INTERFACE_LANGUAGE_NAMESPACE]: INTERFACE_LANGUAGE_EN,
    [INVESTIGATION_CONTROL_NAMESPACE]: INVESTIGATION_CONTROL_EN,
    [OUTCOME_PANEL_NAMESPACE]: OUTCOME_PANEL_EN,
    [INVESTIGATION_HEADER_NAMESPACE]: INVESTIGATION_HEADER_EN,
    [INVESTIGATION_ROSTER_NAMESPACE]: INVESTIGATION_ROSTER_EN,
    [INVESTIGATION_SHELL_NAMESPACE]: INVESTIGATION_SHELL_EN,
    [INVESTIGATION_STATE_NAMESPACE]: INVESTIGATION_STATE_EN,
    [LAB_LAYOUT_NAMESPACE]: LAB_LAYOUT_EN,
    [MISSION_OVERVIEW_NAMESPACE]: MISSION_OVERVIEW_EN,
    [STATUS_TAG_NAMESPACE]: STATUS_TAG_EN,
    [THEME_NAMESPACE]: THEME_EN
};

/** Measured against the English source, so a namespace nobody translated fails the build. */
export const RU_TRANSLATIONS = {
    [ASSUMPTIONS_NAMESPACE]: ASSUMPTIONS_RU,
    [BREAKTHROUGH_NAMESPACE]: BREAKTHROUGH_RU,
    [CAPABILITIES_NAMESPACE]: CAPABILITIES_RU,
    [INTERFACE_LANGUAGE_NAMESPACE]: INTERFACE_LANGUAGE_RU,
    [INVESTIGATION_CONTROL_NAMESPACE]: INVESTIGATION_CONTROL_RU,
    [OUTCOME_PANEL_NAMESPACE]: OUTCOME_PANEL_RU,
    [INVESTIGATION_HEADER_NAMESPACE]: INVESTIGATION_HEADER_RU,
    [INVESTIGATION_ROSTER_NAMESPACE]: INVESTIGATION_ROSTER_RU,
    [INVESTIGATION_SHELL_NAMESPACE]: INVESTIGATION_SHELL_RU,
    [INVESTIGATION_STATE_NAMESPACE]: INVESTIGATION_STATE_RU,
    [LAB_LAYOUT_NAMESPACE]: LAB_LAYOUT_RU,
    [MISSION_OVERVIEW_NAMESPACE]: MISSION_OVERVIEW_RU,
    [STATUS_TAG_NAMESPACE]: STATUS_TAG_RU,
    [THEME_NAMESPACE]: THEME_RU
} satisfies typeof EN_TRANSLATIONS;
