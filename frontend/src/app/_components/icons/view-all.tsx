export function ViewAllIcon(props: {
  title?: string;
  fill?: string;
  secondaryfill?: string;
  width?: string;
  height?: string;
}) {
  const fill = props.fill ?? "currentColor";
  const secondaryfill = props.secondaryfill ?? fill;
  const width = props.width ?? "1em";
  const height = props.height ?? "1em";
  const title = props.title ?? "view all";

  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={fill}>
        <rect
          height="6"
          width="7"
          fill={fill}
          rx="1"
          ry="1"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          x="3"
          y="3"
        />
        <rect
          height="10"
          width="3"
          fill={secondaryfill}
          rx="1"
          ry="1"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          x="14"
          y="6"
        />
        <rect
          height="4"
          width="5"
          fill={fill}
          rx="1"
          ry="1"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          x="5"
          y="13"
        />
      </g>
    </svg>
  );
}
