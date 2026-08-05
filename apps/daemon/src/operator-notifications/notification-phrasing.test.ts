import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { InvestigationEvent } from "@openlab/protocol/investigation-events/investigation-event.types";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import { StatusSnapshotSchema } from "@openlab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { NotificationLanguage } from "@openlab/protocol/operator-notifications/notification-channel.const";
import { describe, expect, it } from "vitest";
import { notificationMessage } from "#src/operator-notifications/notification-phrasing";
import { NOTIFICATION_PHRASES } from "#src/operator-notifications/notification-phrasing.const";

const LAB_URL = "http://127.0.0.1:4318";
const EN = NOTIFICATION_PHRASES[NotificationLanguage.EN];

function snapshot(overrides: Partial<StatusSnapshot> = {}): StatusSnapshot {
    return StatusSnapshotSchema.parse({
        investigation: {
            id: "investigation-7",
            state: InvestigationState.RUNNING,
            goal: "Find a conservation bug",
            started_at: "2026-08-05T00:00:00.000Z",
            updated_at: "2026-08-05T00:00:00.000Z",
            uptime_ms: 0
        },
        ...overrides
    });
}

function event(type: EventType, payload: Record<string, unknown> = {}): InvestigationEvent {
    return {
        id: "event-1",
        investigation_id: "investigation-7",
        type,
        occurred_at: "2026-08-05T00:00:00.000Z",
        payload
    };
}

describe("notificationMessage", () => {
    it("names the investigation and leads back to it, whatever the moment was", () => {
        const message = notificationMessage(
            event(EventType.INVESTIGATION_FAILED, { reason: "The loop gave up" }),
            snapshot(),
            NotificationLanguage.EN,
            LAB_URL
        );

        expect(message?.facts).toContainEqual({
            label: EN.investigation,
            value: "Find a conservation bug"
        });
        expect(message?.link?.url).toBe("http://127.0.0.1:4318/investigations/investigation-7");
    });

    /** The event records the finding by pointer; the claim itself is already in the snapshot. */
    it("says what survived verification rather than which finding identifier did", () => {
        const message = notificationMessage(
            event(EventType.BREAKTHROUGH_RECORDED, { finding_id: "finding-3" }),
            snapshot({ result: { summary: "Fees are minted on refund", limitations: [] } }),
            NotificationLanguage.EN,
            LAB_URL
        );

        expect(message?.body).toBe("Fees are minted on refund");
    });

    it("says what the lab needs and, beside it, why it needs it", () => {
        const message = notificationMessage(
            event(EventType.CAPABILITY_REQUESTED, {
                need: "A mainnet archive node",
                reason: "Replaying the block is the only way to settle the claim"
            }),
            snapshot(),
            NotificationLanguage.EN,
            LAB_URL
        );

        expect(message?.body).toBe("A mainnet archive node");
        expect(message?.facts).toContainEqual({
            label: EN.why,
            value: "Replaying the block is the only way to settle the claim"
        });
    });

    it("names the harness that is not ready apart from what it said", () => {
        const message = notificationMessage(
            event(EventType.HARNESS_PREFLIGHT_FAILED, {
                harness: AgentHarnessKind.CODEX,
                error: "Not logged in"
            }),
            snapshot(),
            NotificationLanguage.EN,
            LAB_URL
        );

        expect(message?.body).toBe("Not logged in");
        expect(message?.facts).toContainEqual({
            label: EN.harness,
            value: AgentHarnessKind.CODEX
        });
    });

    it("stands in for prose the lab never recorded rather than sending an empty message", () => {
        const message = notificationMessage(
            event(EventType.INVESTIGATION_HIBERNATED),
            snapshot(),
            NotificationLanguage.EN,
            LAB_URL
        );

        expect(message?.body).toBe(EN.nothingRecorded);
    });

    it("writes in the language the channel was configured with", () => {
        const russian = notificationMessage(
            event(EventType.BREAKTHROUGH_RECORDED),
            snapshot(),
            NotificationLanguage.RU,
            LAB_URL
        );

        expect(russian?.title).toBe(
            NOTIFICATION_PHRASES[NotificationLanguage.RU].titles[EventType.BREAKTHROUGH_RECORDED]
        );
        expect(russian?.title).not.toBe(EN.titles[EventType.BREAKTHROUGH_RECORDED]);
    });

    it("has nothing to say about a moment the lab never offers to report", () => {
        expect(
            notificationMessage(
                event(EventType.RUN_STARTED),
                snapshot(),
                NotificationLanguage.EN,
                LAB_URL
            )
        ).toBeUndefined();
    });
});
