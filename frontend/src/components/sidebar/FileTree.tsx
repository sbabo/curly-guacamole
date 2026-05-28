import type { DocumentItem } from "../../services/api"

type FileTreeProps = {
    documents: DocumentItem[]
    selectedTmpPath: string | null
    onUpload: (file: File) => void
    onSelectTmp: (relativeTmpPath: string) => void
    onStartIngestion: () => void
    isIngestionBusy: boolean
}

export default function FileTree({
    documents,
    selectedTmpPath,
    onUpload,
    onSelectTmp,
    onStartIngestion,
    isIngestionBusy,
}: Readonly<FileTreeProps>) {

    return (
        <div className="p-4 space-y-4">
            <h2 className="font-bold">
                Documents
            </h2>

            <label className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 cursor-pointer">
                <span>Ajouter un document</span>
                <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                        const nextFile = event.target.files?.[0]
                        if (!nextFile) return
                        onUpload(nextFile)
                        event.target.value = ""
                    }}
                />
            </label>

            <button
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-40"
                onClick={onStartIngestion}
                disabled={!selectedTmpPath || isIngestionBusy}
            >
                {isIngestionBusy ? "Traitement en cours" : "Démarrer ingestion"}
            </button>

            <ul className="space-y-2">
                {documents.map((document) => {
                    const isTmp = document.status === "provisoire"
                    const isSelected = selectedTmpPath === document.relative_path

                    return (
                        <li
                            key={document.relative_path}
                            className={`rounded border p-2 ${
                                isSelected ? "border-blue-400 bg-slate-800" : "border-slate-700"
                            }`}
                        >
                            <button
                                className="w-full text-left"
                                disabled={!isTmp}
                                onClick={() => {
                                    if (!isTmp) return
                                    onSelectTmp(document.relative_path)
                                }}
                            >
                                <div className="text-sm font-medium break-all">{document.name}</div>
                                <div className="text-xs text-slate-400 break-all">{document.relative_path}</div>
                                <span
                                    className={`mt-1 inline-flex rounded px-2 py-1 text-xs ${
                                        isTmp ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                                    }`}
                                >
                                    {document.status}
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}