import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "#src/design-system/class-names";

function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
    return (
        <AccordionPrimitive.Root
            data-slot="accordion"
            className={cn("flex w-full flex-col overflow-hidden rounded-2xl border", className)}
            {...props}
        />
    );
}

function AccordionItem({
    className,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
    return (
        <AccordionPrimitive.Item
            data-slot="accordion-item"
            className={cn("not-last:border-b data-open:bg-muted/50", className)}
            {...props}
        />
    );
}

function AccordionTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    "group/accordion-trigger relative flex flex-1 items-start justify-between gap-6 border border-transparent p-4 text-left text-sm font-medium transition-all outline-none hover:underline disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
                    className
                )}
                {...props}
            >
                {children}
                <ChevronDownIcon
                    data-slot="accordion-trigger-icon"
                    className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
                />
                <ChevronUpIcon
                    data-slot="accordion-trigger-icon"
                    className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
                />
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
}

/**
 * The panel an item opens onto. Two things the registry does to it are dropped here: it pinned the
 * panel to the height Radix measured as it opened, which clips whatever the panel grows by
 * afterwards, and it spaced descendant paragraphs by margin, which a panel laid out with gap counts
 * twice. Both assume the panel holds prose; these ones hold controls that reveal further controls.
 */
function AccordionContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
    return (
        <AccordionPrimitive.Content
            data-slot="accordion-content"
            className="overflow-hidden px-4 text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
            {...props}
        >
            <div
                className={cn(
                    "pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
                    className
                )}
            >
                {children}
            </div>
        </AccordionPrimitive.Content>
    );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
