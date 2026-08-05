import type {
    AgentEffortLevel,
    AgentHarnessKind
} from "@lab/protocol/agents/agent-execution.const";
import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#src/design-system/card";
import { Input } from "#src/design-system/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "#src/design-system/table";
import { ToggleGroup, ToggleGroupItem } from "#src/design-system/toggle-group";
import {
    EFFORT_LEVELS,
    EFFORT_OPTION,
    MODEL_COLUMN,
    ROLE_CARD,
    ROLE_TABLE,
    ROLE_TABLE_CONTENT,
    SELECTABLE_HARNESSES,
    SETTABLE_ROLES
} from "#src/harness-settings/harness-settings.const";
import { HARNESS_SETTINGS_NAMESPACE } from "#src/harness-settings/harness-settings.i18n";
import type { LabSettingsDraft } from "#src/harness-settings/harness-settings.types";
import { isEffort, roleExecution, roleModel } from "#src/harness-settings/harness-settings-draft";

interface RoleExecutionTableProps {
    settings: LabSettingsDraft;
    chooseEffort: (role: AgentRole, effort: AgentEffortLevel) => void;
    chooseModel: (role: AgentRole, harness: AgentHarnessKind, model: string) => void;
}

/**
 * Every role against everything it is run with. Effort crosses the vendors unchanged, so a role
 * sets it once; a model cannot, so every harness the role may land on gets a column of its own and
 * the whole page is read down a column or across a row rather than card by card.
 */
export function RoleExecutionTable({
    settings,
    chooseEffort,
    chooseModel
}: RoleExecutionTableProps) {
    const { t } = useTranslation(HARNESS_SETTINGS_NAMESPACE);
    const fieldId = useId();

    return (
        <Card className={ROLE_CARD}>
            <CardHeader>
                <CardTitle>{t("roles")}</CardTitle>
                <CardDescription>{t("modelHint")}</CardDescription>
            </CardHeader>
            <CardContent className={ROLE_TABLE_CONTENT}>
                <Table className={ROLE_TABLE} aria-label={t("roles")}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("roleColumn")}</TableHead>
                            <TableHead id={`${fieldId}-effort`}>{t("effort")}</TableHead>
                            {SELECTABLE_HARNESSES.map((harness) => (
                                <TableHead key={harness} className={MODEL_COLUMN}>
                                    {HARNESS_NAME[harness]}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {SETTABLE_ROLES.map((role) => (
                            <TableRow key={role} aria-label={role}>
                                <TableHead scope="row" id={`${fieldId}-${role}`}>
                                    {t(role)}
                                </TableHead>
                                <TableCell>
                                    <ToggleGroup
                                        type="single"
                                        variant="outline"
                                        size="sm"
                                        spacing={0}
                                        value={roleExecution(settings, role).effort}
                                        aria-labelledby={`${fieldId}-${role} ${fieldId}-effort`}
                                        onValueChange={(chosen) => {
                                            if (isEffort(chosen)) {
                                                chooseEffort(role, chosen);
                                            }
                                        }}
                                    >
                                        {EFFORT_LEVELS.map((level) => (
                                            <ToggleGroupItem
                                                key={level}
                                                value={level}
                                                aria-label={t(level)}
                                                className={EFFORT_OPTION}
                                            >
                                                {t(level)}
                                            </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </TableCell>
                                {SELECTABLE_HARNESSES.map((harness) => (
                                    <TableCell key={harness}>
                                        <Input
                                            aria-label={HARNESS_NAME[harness]}
                                            value={roleModel(settings, role, harness)}
                                            placeholder={t("modelPlaceholder")}
                                            autoComplete="off"
                                            spellCheck={false}
                                            onChange={(event) =>
                                                chooseModel(role, harness, event.target.value)
                                            }
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
