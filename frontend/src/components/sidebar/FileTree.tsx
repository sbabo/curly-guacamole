type FileNode = {
    name: string
    type: string
    children?: FileNode[]
}

// Recursive tree renderer for folders and files.
function Tree({ nodes }: { nodes: FileNode[] }) {

    return (
        <ul className="pl-4">

            {nodes.map((node, index) => (

                <li key={index} className="mb-2">

                    <div>
                        {/* Small visual cue depending on node type. */}
                        {node.type === "folder" ? "📁" : "📄"} {node.name}
                    </div>

                    {/* Render children only when the current node is a folder with content. */}
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