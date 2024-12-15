export function CheckIcon(props: {
    fill?: string;
    width?: string;
    height?: string;
    title?: string;
}) {
    const fill = props.fill ?? "currentColor";
    const width = props.width ?? "1em";
    const height = props.height ?? "1em";
    const title = props.title ?? "check";

    return (
        <svg
            height={height}
            width={width}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>{title}</title>
            <g fill={fill}>
                <polyline
                    fill="none"
                    points="4 11 8 15 16 5"
                    stroke={fill}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
            </g>
        </svg>
    );
}
