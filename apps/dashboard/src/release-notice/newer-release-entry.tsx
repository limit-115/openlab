import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarMenuButton, SidebarMenuItem } from "#src/design-system/sidebar";
import { RELEASE_NOTICE_NAMESPACE } from "#src/release-notice/release-notice.i18n";
import {
    fetchReleaseNotice,
    releaseNoticeQueryKey
} from "#src/release-notice/release-notice-client";

/**
 * A release the lab does not have, said once and quietly.
 *
 * It is a link to what changed and not a button that installs anything. A lab is watched while it
 * researches for hours, and a page that could replace the program underneath that from a stray
 * click would be worse than one that says where to read about it and leaves the moment to the
 * operator. There is nothing here at all when there is nothing newer, which is nearly always.
 */
export function NewerReleaseEntry() {
    const { t } = useTranslation(RELEASE_NOTICE_NAMESPACE);
    const release = useQuery({
        queryKey: releaseNoticeQueryKey,
        queryFn: ({ signal }) => fetchReleaseNotice(signal),
        retry: false,
        staleTime: Number.POSITIVE_INFINITY
    });

    const newer = release.data?.newer;
    if (!newer) {
        return null;
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton size="sm" tooltip={t("command")} asChild>
                <a href={newer.notes_url} target="_blank" rel="noreferrer">
                    <ArrowUpCircleIcon />
                    <span>{t("available", { version: newer.offered_version })}</span>
                </a>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
