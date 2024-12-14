export function SharkWaterIcon(props: {
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
    const title = props.title ?? "shark water";

    return (
        <svg
            height={height}
            width={width}
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>{title}</title>
            <g fill={fill}>
                <path
                    d="M3.298,12.453c.125-.101,.244-.21,.349-.336,.392-.469,.95-.755,1.552-.802l.037-.007,.217-.007c.612,0,1.211,.295,1.644,.809,.474,.565,1.167,.888,1.907,.888,.581,0,1.145-.205,1.589-.577,.111-.093,.215-.197,.308-.309,.429-.511,1.057-.804,1.724-.804,.5,0,.974,.166,1.36,.46,.013-.298,.015-.484,.015-.52-.015-4.897-4.248-9.205-9.06-9.219-.199-.034-.458,.109-.601,.298-.143,.188-.188,.433-.123,.659,.013,.046,1.317,4.684-.174,8.016-.005,.015-.208,.567-.745,1.451Z"
                    fill={fill}
                />
                <path
                    d="M16.225,16c-1.343,0-2.617-.49-3.603-1.368-.034,.03-.068,.059-.102,.088-2.102,1.761-5.146,1.673-7.143-.087-.986,.877-2.26,1.368-3.603,1.368h-.029c-.414-.002-.748-.34-.746-.754,.002-.413,.337-.746,.75-.746,.007,0,.017,0,.025,0,1.173,0,2.274-.517,3.022-1.42,.142-.171,.353-.271,.576-.271h.002c.222,0,.432,.098,.575,.268,1.41,1.682,3.925,1.903,5.606,.494,.178-.149,.345-.316,.494-.494,.143-.17,.353-.268,.575-.268,.227,.046,.435,.099,.578,.271,.753,.909,1.896,1.412,3.043,1.42h.004c.413,0,.748,.333,.75,.746,.002,.414-.332,.752-.746,.754h-.029Z"
                    fill={secondaryfill}
                />
            </g>
        </svg>
    );
}
