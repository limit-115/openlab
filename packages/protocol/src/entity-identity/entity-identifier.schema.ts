import { z } from "zod";

export const IdentifierSchema = z.string().trim().min(1).max(200);
