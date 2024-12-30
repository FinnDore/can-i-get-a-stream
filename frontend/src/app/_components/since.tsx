import { formatDistanceToNowStrict } from "date-fns";
import { useLayoutEffect, useState } from "react";

export function Elapased(props: { date: Date }) {
    const [elapsed, setElapsed] = useState<string | null>(null);
    useLayoutEffect(() => {
        setElapsed(formatDistanceToNowStrict(props.date));
        const interval = setInterval(() => {
            setElapsed(formatDistanceToNowStrict(props.date));
        }, 1000);

        return () => clearInterval(interval);
    }, [props.date]);

    return elapsed;
}
