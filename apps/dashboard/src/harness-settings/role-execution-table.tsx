import type {
    AgentEffortLevel,
    AgentHarnessKind
} from "@lab/protocol/agents/agent-execution.const";
import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { useId } from "react";
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
    EFFORT_LABEL,
    EFFORT_LEVELS,
    EFFORT_OPTION,
    MODEL_COLUMN,
    MODEL_HINT,
    MODEL_PLACEHOLDER,
    ROLE_CARD,
    ROLE_COLUMN_LABEL,
    ROLE_EXECUTION_LABEL,
    ROLE_NAME,
    ROLE_TABLE,
    ROLE_TABLE_CONTENT,
    SELECTABLE_HARNESSES,
    SETTABLE_ROLES
} from "#src/harness-settings/harness-settings.const";
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
    const fieldId = useId();

    return (
        <Card className={ROLE_CARD}>
            <CardHeader>
                <CardTitle>{ROLE_EXECUTION_LABEL}</CardTitle>
                <CardDescription>{MODEL_HINT}</CardDescription>
            </CardHeader>
            <CardContent className={ROLE_TABLE_CONTENT}>
                <Table className={ROLE_TABLE} aria-label={ROLE_EXECUTION_LABEL}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{ROLE_COLUMN_LABEL}</TableHead>
                            <TableHead id={`${fieldId}-effort`}>{EFFORT_LABEL}</TableHead>
                            {SELECTABLE_HARNESSES.map((harness) => (
                                <TableHead key={harness} className={MODEL_COLUMN}>
                                    {harness}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {SETTABLE_ROLES.map((role) => (
                            <TableRow key={role} aria-label={role}>
                                <TableHead
                                    scope="row"
                                    id={`${fieldId}-${role}`}
                                    className={ROLE_NAME}
                                >
                                    {role}
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
                                                aria-label={level}
                                                className={EFFORT_OPTION}
                                            >
                                                {level}
                                            </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </TableCell>
                                {SELECTABLE_HARNESSES.map((harness) => (
                                    <TableCell key={harness}>
                                        <Input
                                            aria-label={harness}
                                            value={roleModel(settings, role, harness)}
                                            placeholder={MODEL_PLACEHOLDER}
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
