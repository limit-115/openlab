import type { z } from "zod";
import type {
    ReleaseNoticeResponseSchema,
    ReleaseNoticeSchema
} from "#src/release-notice/release-notice.schema";

export type ReleaseNotice = z.infer<typeof ReleaseNoticeSchema>;

export type ReleaseNoticeResponse = z.infer<typeof ReleaseNoticeResponseSchema>;
