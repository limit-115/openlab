import { useTranslation } from "react-i18next";
import { Badge } from "#src/design-system/badge";
import { STATUS_TAG_TONE } from "#src/status-tag/status-tag.const";
import { STATUS_TAG_NAMESPACE } from "#src/status-tag/status-tag.i18n";
import type { TaggedStatus } from "#src/status-tag/status-tag.types";

interface StatusTagProps {
    status: TaggedStatus;
}

export function StatusTag({ status }: StatusTagProps) {
    const { t } = useTranslation(STATUS_TAG_NAMESPACE);

    return <Badge variant={STATUS_TAG_TONE[status]}>{t(status)}</Badge>;
}
