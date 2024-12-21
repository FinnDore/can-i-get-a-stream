import { CSSProperties } from "react";
import { cn } from "../_utils/cn";

export function Arc(props: {
    children: React.ReactNode;
    className?: string;
    style?: CSSProperties;
    hidden?: boolean;
}) {
    return (
        <div
            className={cn(
                "relative rounded-md border border-black/10 bg-white p-1 shadow-md",
                props.className,
                { hidden: props.hidden },
            )}
            hidden={props.hidden}
            aria-hidden={props.hidden}
            style={props.style}
        >
            <div className="noise absolute top-0 left-0 w-full rounded-md opacity-40 invert"></div>
            <div className="min-h-full min-w-full overflow-hidden rounded-md border border-black/10 bg-[#fafafafa] shadow-lg">
                {props.children}
            </div>
        </div>
    );
}
