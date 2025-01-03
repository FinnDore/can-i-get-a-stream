export default function Stream(props: { params: { streamId?: string } }) {
    if (!props.params.streamId) return <div>stream not found</div>;
    return <div>stream {JSON.stringify(props)}</div>;
}
