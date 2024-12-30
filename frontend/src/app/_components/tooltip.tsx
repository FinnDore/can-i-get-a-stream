"use client";

import {
    Content,
    Portal,
    Provider,
    Root,
    Trigger,
} from "@radix-ui/react-tooltip";
import * as React from "react";
import { cn } from "../_utils/cn";

export const TooltipProvider = Provider;

export const Tooltip = Root;

export const TooltipTrigger = Trigger;

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof Content>,
    React.ComponentPropsWithoutRef<typeof Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <Portal>
        <Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md bg-black px-3 py-1.5 text-xs text-white",
                className,
            )}
            {...props}
        />
    </Portal>
));

TooltipContent.displayName = Content.displayName;

export function ToolTip(props: {
    children: React.ReactNode;
    tooltip: React.ReactNode;
}) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>{props.children}</TooltipTrigger>
                <TooltipContent>{props.tooltip}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
