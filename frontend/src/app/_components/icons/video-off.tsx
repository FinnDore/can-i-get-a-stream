export function VideoOffIcon(props: {
    fill?: string;
    secondaryfill?: string;
    strokewidth?: number;
    width?: string;
    height?: string;
    className?: string;
    title?: string;
}) {
    const fill = props.fill ?? "currentColor";
    const secondaryfill = props.secondaryfill ?? fill;
    const width = props.width ?? "1em";
    const height = props.height ?? "1em";
    const title = props.title ?? "video off";

    return (
        <svg
            height={height}
            width={width}
            className={props.className}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>{title}</title>
            <g fill={fill}>
                <path
                    d="m18.4656,5.7766l-4.4656,4.4656-.5959.5959-6.1619,6.1619h3.2578c1.933,0,3.5-1.567,3.5-3.5v-1.9808l2.7471,3.1395c.1943.2212.4707.3413.7529.3413.1182,0,.2373-.021.3516-.064.3906-.1465.6484-.5195.6484-.936V6c0-.0772-.0175-.1504-.0344-.2234Z"
                    fill={fill}
                    strokeWidth="0"
                />
                <path
                    d="m3.5786,16.4214L13.9542,6.0458c-.2249-1.7161-1.6768-3.0458-3.4542-3.0458h-5c-1.933,0-3.5,1.567-3.5,3.5v7c0,1.2225.6288,2.2956,1.5786,2.9214Zm2.1714-10.9214c.6904,0,1.25.5596,1.25,1.25s-.5596,1.25-1.25,1.25-1.25-.5596-1.25-1.25.5596-1.25,1.25-1.25Z"
                    fill={fill}
                    strokeWidth="0"
                />
                <path
                    d="m3,18c-.2559,0-.5117-.0977-.707-.293-.3906-.3906-.3906-1.0234,0-1.4141L16.293,2.293c.3906-.3906,1.0234-.3906,1.4141,0s.3906,1.0234,0,1.4141L3.707,17.707c-.1953.1953-.4512.293-.707.293Z"
                    fill={secondaryfill}
                    strokeWidth="0"
                />
            </g>
        </svg>
    );
}
