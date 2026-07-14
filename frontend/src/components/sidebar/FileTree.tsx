import { type SearchHit, downloadDocument } from "../../services/api"

type Props = {
    hits?: SearchHit[] | undefined
}

function getConfidence(hit: SearchHit): number | null {
    if (hit.distance === null || !Number.isFinite(hit.distance)) {
        return null
    }

    return Math.round(Math.max(0, Math.min(100, (1 - hit.distance) * 100)))
}

function confidenceLabel(confidence: number | null): string {
    if (confidence === null) {
        return "Confiance indisponible"
    }

    if (confidence >= 80) {
        return "Très pertinent"
    }

    if (confidence >= 60) {
        return "Pertinent"
    }

    return "À vérifier"
}

export default function FileTree({ hits }: Props) {
    const noSearch = hits === undefined
    const sortedHits = [...(hits ?? [])].sort((first, second) => {
        const firstConfidence = getConfidence(first)
        const secondConfidence = getConfidence(second)

        if (firstConfidence === null) return 1
        if (secondConfidence === null) return -1
        return secondConfidence - firstConfidence
    })

    async function handleDownload(hit: SearchHit) {
        try {
            const blob = await downloadDocument(hit.file_path)
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = hit.title || hit.file_path.split("/").pop() || "document"
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("Téléchargement échoué", err)
        }
    }

    return (
        <div className="p-4 space-y-4">
            <h2 className="font-bold">Résultats de recherche</h2>

            <p className="text-sm text-slate-400">Utilisez le champ de message pour rechercher un document ou en ajouter un via le bouton "+".</p>

            <div className="mt-2 space-y-2">
                {noSearch ? null : sortedHits.length === 0 ? (
                    <div className="text-sm text-slate-500">Aucun document trouvé</div>
                ) : (
                    sortedHits.map((hit) => {
                        const confidence = getConfidence(hit)
                        const label = confidenceLabel(confidence)

                        return (
                        <article key={`${hit.document_id}-${hit.file_path}`} className="space-y-2 rounded-md border border-slate-800 bg-slate-950/50 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-semibold text-slate-100" title={hit.title}>{hit.title}</h3>
                                    <p className="truncate text-xs text-slate-400" title={hit.file_path}>{hit.file_path}</p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-amber-200">
                                    {confidence === null ? "—" : `${confidence}%`}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>{label}</span>
                                    <span>Score de confiance</span>
                                </div>
                                <div
                                    className="h-1.5 overflow-hidden rounded-full bg-slate-800"
                                    role="progressbar"
                                    aria-label={`Confiance pour ${hit.title}`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={confidence ?? 0}
                                >
                                    <div
                                        className="h-full rounded-full bg-amber-400 transition-[width]"
                                        style={{ width: `${confidence ?? 0}%` }}
                                    />
                                </div>
                            </div>

                            {hit.describe ? <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">{hit.describe}</p> : null}

                            <div>
                                <button
                                    onClick={() => void handleDownload(hit)}
                                    className="w-full rounded-md bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
                                >
                                    Télécharger
                                </button>
                            </div>
                        </article>
                        )
                    })
                )}
            </div>
        </div>
    )
}