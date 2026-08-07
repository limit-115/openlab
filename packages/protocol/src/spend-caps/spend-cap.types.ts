import type { z } from "zod";
import type {
    SpendCapSchema,
    SpendCapsSchema,
    WalletFloorCapSchema,
    WindowPercentCapSchema
} from "#src/spend-caps/spend-cap.schema";

export type WindowPercentCap = z.infer<typeof WindowPercentCapSchema>;
export type WalletFloorCap = z.infer<typeof WalletFloorCapSchema>;
export type SpendCap = z.infer<typeof SpendCapSchema>;
export type SpendCaps = z.infer<typeof SpendCapsSchema>;
