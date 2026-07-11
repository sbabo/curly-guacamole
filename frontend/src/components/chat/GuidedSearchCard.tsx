import { useState } from "react"
import type { GuidedStage } from "../../services/api"

type GuidedSearchCardProps = {
    guided: GuidedStage
    guessedFields: Record<string, string>
    disabled: boolean
    onSubmit: (docType: string, fieldValues: Record<string, string>) => void
}

export default function GuidedSearchCard({
    guided,
    guessedFields,
    disabled,
    onSubmit,
}: Readonly<GuidedSearchCardProps>) {

    // Type de document sélectionné : présélectionné s'il n'y en a qu'un seul possible.
    const [selectedDocType, setSelectedDocType] = useState(
        guided.doc_types.length === 1 ? guided.doc_types[0] : ""
    )

    // Valeurs des champs du formulaire, pré-remplies avec les champs devinés par le LLM.
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({ ...guessedFields })

    const needsDocTypeChoice = guided.doc_types.length > 1
    const canSubmit = !disabled && (!needsDocTypeChoice || selectedDocType !== "")

    function updateField(fieldName: string, value: string) {
        setFieldValues((prev) => ({ ...prev, [fieldName]: value }))
    }

    function handleSubmit() {
        if (!canSubmit) return
        onSubmit(selectedDocType, fieldValues)
    }

    return (
        <div className="max-w-[80%] rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 shadow-lg text-amber-50">

            <div className="mb-2 text-[10px] uppercase tracking-[0.28em] opacity-70">
                Recherche guidée
            </div>

            {needsDocTypeChoice && (
                <div className="mb-3">
                    <label className="mb-1 block text-xs text-amber-100/80">Type de document</label>
                    <select
                        className="w-full rounded-xl border border-amber-300/30 bg-slate-900/80 px-3 py-2 text-white outline-none focus:border-amber-400/60"
                        value={selectedDocType}
                        disabled={disabled}
                        onChange={(e) => setSelectedDocType(e.target.value)}
                    >
                        <option value="" disabled>
                            Choisir un type...
                        </option>
                        {guided.doc_types.map((docType) => (
                            <option key={docType} value={docType}>
                                {docType}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {guided.questions.length > 0 && (
                <div className="mb-3 flex flex-col gap-2">
                    {guided.questions.map((question) => (
                        <div key={question.field_name}>
                            <label className="mb-1 block text-xs text-amber-100/80">
                                {question.field_name}
                                {question.is_mandatory && <span className="text-red-300"> *</span>}
                            </label>
                            <input
                                className="w-full rounded-xl border border-amber-300/30 bg-slate-900/80 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-amber-400/60"
                                value={fieldValues[question.field_name] ?? ""}
                                disabled={disabled}
                                onChange={(e) => updateField(question.field_name, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <button
                type="button"
                className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSubmit}
                disabled={!canSubmit}
            >
                Rechercher
            </button>

        </div>
    )
}
