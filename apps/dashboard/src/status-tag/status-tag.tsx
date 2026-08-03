import { Badge } from "#src/design-system/badge";
import { STATUS_TAG_LABEL, STATUS_TAG_TONE } from "#src/status-tag/status-tag.const";
import type { TaggedStatus } from "#src/status-tag/status-tag.types";

interface StatusTagProps {
    status: TaggedStatus;
}

export function StatusTag({ status }: StatusTagProps) {
    return <Badge variant={STATUS_TAG_TONE[status]}>{STATUS_TAG_LABEL[status]}</Badge>;
}
