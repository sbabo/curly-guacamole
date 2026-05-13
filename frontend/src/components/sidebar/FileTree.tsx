type FileNode = {
    name: string
    type: string
    children?: FileNode[]
}

function Tree({ nodes }: { nodes: FileNode[] }) {

    return (
        <ul className="pl-4">

            {nodes.map((node, index) => (

                <li key={index} className="mb-2">

                    <div>
                        {node.type === "folder" ? "📁" : "📄"} {node.name}
                    </div>

                    {node.children && (
                        <Tree nodes={node.children} />
                    )}

                </li>
            ))}

        </ul>
    )
}

export default function FileTree({ files }: { files: FileNode[] }) {

    return (
        <div className="p-4">
            <h2 className="font-bold mb-4">
                Files
            </h2>

            <Tree nodes={files} />
        </div>
    )
}