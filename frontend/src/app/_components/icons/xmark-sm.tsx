export function XmarkSmIcon(props: {
    fill?: string;
    secondaryfill?: string;
    width?: string;
    height?: string;
    title?: string;
}) {
    const fill = props.fill ?? "currentColor";
    const secondaryfill = props.secondaryfill ?? fill;
    const width = props.width ?? "1em";
    const height = props.height ?? "1em";
    const title = props.title ?? "xmark sm";

    return (
        <svg
            height={height}
            width={width}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>{title}</title>
            <g fill={fill}>
                <line
                    fill="none"
                    stroke={secondaryfill}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    x1="7"
                    x2="13"
                    y1="7"
                    y2="13"
                />
                <line
                    fill="none"
                    stroke={fill}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    x1="7"
                    x2="13"
                    y1="13"
                    y2="7"
                />
            </g>
        </svg>
    );
}
