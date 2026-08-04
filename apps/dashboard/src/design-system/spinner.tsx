import { Loader2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "#src/design-system/class-names";
import { DESIGN_SYSTEM_NAMESPACE } from "#src/design-system/design-system.i18n";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    const { t } = useTranslation(DESIGN_SYSTEM_NAMESPACE);

    return (
        <Loader2Icon
            data-slot="spinner"
            role="status"
            aria-label={t("loading")}
            className={cn("size-4 animate-spin", className)}
            {...props}
        />
    );
}

export { Spinner };
