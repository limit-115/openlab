import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { CapabilityStatus } from "@openlab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";
import type { TaggedStatus } from "#src/status-tag/status-tag.types";

export const STATUS_TAG_NAMESPACE = "status-tag" as const;

/**
 * The protocol spells its statuses in lower case because they are values on a wire. On the page
 * they are words somebody reads, so each one is written out here the way a sentence would open.
 * The wire value is the key, which is why the pill needs no lookup table of its own.
 */
export const STATUS_TAG_EN = {
    [AgentRunStatus.RUNNING]: "Running",
    [AgentRunStatus.SUCCEEDED]: "Succeeded",
    [AgentRunStatus.FAILED]: "Failed",
    [AgentRunStatus.TIMED_OUT]: "Timed out",
    [AgentRunStatus.CANCELLED]: "Cancelled",
    [AgentRunStatus.BLOCKED]: "Blocked",
    [LeadStatus.OPEN]: "Open",
    [LeadStatus.RESEARCHING]: "Being researched",
    [LeadStatus.EXHAUSTED]: "Ran out",
    [LeadStatus.CONFIRMED]: "Confirmed",
    [FindingStatus.UNVERIFIED]: "Unverified",
    [FindingStatus.REFUTED]: "Refuted",
    [CapabilityStatus.ANSWERED]: "Answered"
} satisfies Record<TaggedStatus, string>;

export const STATUS_TAG_RU = {
    [AgentRunStatus.RUNNING]: "Выполняется",
    [AgentRunStatus.SUCCEEDED]: "Успешно",
    [AgentRunStatus.FAILED]: "Ошибка",
    [AgentRunStatus.TIMED_OUT]: "Истекло время",
    [AgentRunStatus.CANCELLED]: "Отменено",
    [AgentRunStatus.BLOCKED]: "Заблокировано",
    [LeadStatus.OPEN]: "Открыто",
    [LeadStatus.RESEARCHING]: "Исследуется",
    [LeadStatus.EXHAUSTED]: "Исчерпано",
    [LeadStatus.CONFIRMED]: "Подтверждено",
    [FindingStatus.UNVERIFIED]: "Не проверено",
    [FindingStatus.REFUTED]: "Опровергнуто",
    [CapabilityStatus.ANSWERED]: "Отвечено"
} satisfies Translated<typeof STATUS_TAG_EN>;
