import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { COPIED_LABEL, COPY_FEEDBACK_DURATION_MS } from "#src/clipboard/copy-button.const";
import { Button } from "#src/design-system/button";
import { cn } from "#src/design-system/class-names";
import { Tooltip, TooltipContent, TooltipTrigger } from "#src/design-system/tooltip";

interface CopyButtonProps {
    /** The exact text handed to the clipboard. */
    value: string;
    /** What the operator is copying, used as the accessible name and the idle tooltip. */
    label: string;
    className?: string;
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [copied]);

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn("text-muted-foreground", className)}
                    aria-label={copied ? COPIED_LABEL : label}
                    onClick={() => void copy()}
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? COPIED_LABEL : label}</TooltipContent>
        </Tooltip>
    );
}
