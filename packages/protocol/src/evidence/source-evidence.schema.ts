import { z } from "zod";
import { SourceClassification, SourceRetrievalMethod } from "#src/evidence/source-evidence.const";

export const SourceEvidenceMetadataSchema = z.object({
    requested_url: z.url(),
    final_url: z.url(),
    title: z.string().trim().min(1),
    claimed_classification: z.enum(SourceClassification),
    retrieval_method: z.literal(SourceRetrievalMethod.DAEMON_HTTP),
    http_status: z.int().min(200).max(299),
    fetched_at: z.iso.datetime()
});
