import { Badge } from "#src/design-system/badge";
import { STATUS_TAG_TONE } from "#src/status-tag/status-tag.const";
import type { TaggedStatus } from "#src/status-tag/status-tag.types";

interface StatusTagProps {
    status: TaggedStatus;
    label?: string;
}

export function StatusTag({ status, label }: StatusTagProps) {
    return <Badge variant={STATUS_TAG_TONE[status]}>{label ?? status}</Badge>;
}
