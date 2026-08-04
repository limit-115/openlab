import type { z } from "zod";
import type {
    NotificationTestRequestSchema,
    NotificationTestResultSchema
} from "#src/operator-notifications/notification-test.schema";

export type NotificationTestRequest = z.infer<typeof NotificationTestRequestSchema>;
export type NotificationTestResult = z.infer<typeof NotificationTestResultSchema>;
