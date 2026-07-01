import { useEffect, useState } from "react"
import type { IngestJobSnapshot } from "../../services/api"
import "./ingestion-animations.css"

type IngestionProgressCardProps = {
    activeJob: IngestJobSnapshot
    ingestionAnswer: string
    isIngestionBusy: boolean
    isEditingDraft: boolean
    draftDetectedType: string
    draftMandatoryFields: Array<{ field_name: string; field_value: string }>
    draftOptionalFields: Array<{ field_name: string; field_value: string }>
    onIngestionAnswerChange: (value: string) => void
    onAnswerIngestion: () => void
    onConfirmIngestion: () => void
    onEditDraft: () => void
    onApplyDraftChanges: () => void
    onCancelEdit: () => void
    onUpdateDraftField: (
        section: "mandatory" | "optional",
        index: number,
        key: "field_name" | "field_value",
        value: string
    ) => void
    onAddDraftField: (section: "mandatory" | "optional") => void
    onDetectedTypeChange: (type: string) => void
}

export default function IngestionProgressCard({
    activeJob,
    ingestionAnswer,
    isIngestionBusy,
    isEditingDraft,
    draftDetectedType,
    draftMandatoryFields,
    draftOptionalFields,
    onIngestionAnswerChange,
    onAnswerIngestion,
    onConfirmIngestion,
    onEditDraft,
    onApplyDraftChanges,
    onCancelEdit,
    onUpdateDraftField,
    onAddDraftField,
    onDetectedTypeChange,
}: Readonly<IngestionProgressCardProps>) {
    const [showType, setShowType] = useState(false)
    const [showKeys, setShowKeys] = useState(false)
    const [showFields, setShowFields] = useState(false)

    useEffect(() => {
        // Animation séquentielle : type → clés → champs
        if (activeJob.detected_type) {
            const timer1 = setTimeout(() => setShowType(true), 100)
            const timer2 = setTimeout(() => setShowKeys(true), 500)
            const timer3 = setTimeout(() => setShowFields(true), 900)
            return () => {
                clearTimeout(timer1)
                clearTimeout(timer2)
                clearTimeout(timer3)
            }
        }
    }, [activeJob.detected_type])

    const isProcessing = activeJob.status === "processing" || activeJob.status === "queued"

    return (
        <div className={`ingestion-progress-card ${isProcessing ? "processing" : ""}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-amber-200/70">
                        Ingestion en cours
                    </div>
                    <div className="mt-1 font-semibold text-white break-all">
                        {activeJob.relative_tmp_path}
                    </div>
                    <div className="mt-1 text-amber-100/80">{activeJob.message}</div>

                    {showType && activeJob.detected_type && (
                        <div className="mt-2 text-xs text-amber-100/70 fade-in-slide">
                            Type détecté:{" "}
                            <span className="font-semibold text-amber-100">
                                {activeJob.detected_type}
                            </span>
                        </div>
                    )}
                </div>
                <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100">
                    {activeJob.status}
                </div>
            </div>

            {showKeys && (activeJob.mandatory_keys_expected.length > 0 || activeJob.optional_keys_expected.length > 0) && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 fade-in-slide">
                    {activeJob.mandatory_keys_expected.length > 0 && (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                                Mots-clés obligatoires recherchés
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {activeJob.mandatory_keys_expected.map((keyName, index) => (
                                    <span
                                        key={keyName}
                                        className="rounded-full border border-amber-300/30 px-2 py-1 text-xs fade-in-slide"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        {keyName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeJob.optional_keys_expected.length > 0 && (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                                Mots-clés facultatifs recherchés
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {activeJob.optional_keys_expected.map((keyName, index) => (
                                    <span
                                        key={keyName}
                                        className="rounded-full border border-sky-300/30 px-2 py-1 text-xs fade-in-slide"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        {keyName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showFields && (activeJob.mandatory_fields.length > 0 || activeJob.optional_fields.length > 0) && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 fade-in-slide">
                    {activeJob.mandatory_fields.length > 0 && (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                                Valeurs obligatoires détectées
                            </div>
                            <div className="mt-2 space-y-2">
                                {activeJob.mandatory_fields.map((field, index) => (
                                    <div
                                        key={`mandatory-${field.field_name}`}
                                        className="rounded border border-slate-700 px-2 py-1 text-xs fade-in-slide"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <span className="font-semibold text-amber-200">
                                            {field.field_name}
                                        </span>
                                        : {field.field_value || "(vide)"}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeJob.optional_fields.length > 0 && (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                                Valeurs facultatives détectées
                            </div>
                            <div className="mt-2 space-y-2">
                                {activeJob.optional_fields.map((field, index) => (
                                    <div
                                        key={`optional-${field.field_name}`}
                                        className="rounded border border-slate-700 px-2 py-1 text-xs fade-in-slide"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <span className="font-semibold text-sky-200">
                                            {field.field_name}
                                        </span>
                                        : {field.field_value || "(vide)"}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeJob.next_question && activeJob.status === "waiting_user_input" && (
                <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-slate-100">
                        {activeJob.next_question}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500"
                            value={ingestionAnswer}
                            onChange={(event) => onIngestionAnswerChange(event.target.value)}
                            placeholder="Réponse à la question d'extraction"
                        />
                        <button
                            className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={onAnswerIngestion}
                            disabled={!ingestionAnswer.trim() || isIngestionBusy}
                            type="button"
                        >
                            Répondre
                        </button>
                    </div>
                </div>
            )}

            {activeJob.status === "ready_for_validation" && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-50">
                    <div>
                        <div className="font-semibold">Prêt à valider</div>
                        <div className="text-sm text-emerald-50/80">
                            Les champs obligatoires sont complets. Tu peux confirmer l'indexation.
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="rounded-xl border border-emerald-200/60 px-4 py-2 font-semibold text-emerald-50 transition hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={onEditDraft}
                            disabled={isIngestionBusy}
                            type="button"
                        >
                            Modifier un élément
                        </button>
                        <button
                            className="rounded-xl bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={onConfirmIngestion}
                            disabled={isIngestionBusy}
                            type="button"
                        >
                            Confirmer
                        </button>
                    </div>
                </div>
            )}

            {isEditingDraft && (
                <div className="mt-4 space-y-4 rounded-xl border border-amber-300/30 bg-slate-950/60 p-4">
                    <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/80">
                            Type de contrat
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {activeJob.detected_type_options.map((option) => (
                                <label key={option} className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="detected-type"
                                        checked={draftDetectedType === option}
                                        onChange={() => onDetectedTypeChange(option)}
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/80">
                                Paires obligatoire clé/valeur
                            </div>
                            <div className="space-y-2">
                                {draftMandatoryFields.map((field, index) => (
                                    <div
                                        key={`draft-m-${field.field_name || "vide"}-${index}`}
                                        className="grid grid-cols-2 gap-2"
                                    >
                                        <input
                                            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                            value={field.field_name}
                                            onChange={(event) =>
                                                onUpdateDraftField("mandatory", index, "field_name", event.target.value)
                                            }
                                            placeholder="Clé"
                                        />
                                        <input
                                            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                            value={field.field_value}
                                            onChange={(event) =>
                                                onUpdateDraftField("mandatory", index, "field_value", event.target.value)
                                            }
                                            placeholder="Valeur"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                className="mt-2 rounded border border-amber-300/40 px-3 py-1 text-xs"
                                onClick={() => onAddDraftField("mandatory")}
                                type="button"
                            >
                                Ajouter obligatoire
                            </button>
                        </div>

                        <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/80">
                                Paires facultative clé/valeur
                            </div>
                            <div className="space-y-2">
                                {draftOptionalFields.map((field, index) => (
                                    <div
                                        key={`draft-o-${field.field_name || "vide"}-${index}`}
                                        className="grid grid-cols-2 gap-2"
                                    >
                                        <input
                                            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                            value={field.field_name}
                                            onChange={(event) =>
                                                onUpdateDraftField("optional", index, "field_name", event.target.value)
                                            }
                                            placeholder="Clé"
                                        />
                                        <input
                                            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                            value={field.field_value}
                                            onChange={(event) =>
                                                onUpdateDraftField("optional", index, "field_value", event.target.value)
                                            }
                                            placeholder="Valeur"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                className="mt-2 rounded border border-sky-300/40 px-3 py-1 text-xs"
                                onClick={() => onAddDraftField("optional")}
                                type="button"
                            >
                                Ajouter facultatif
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            className="rounded bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                            onClick={onApplyDraftChanges}
                            disabled={isIngestionBusy}
                            type="button"
                        >
                            Appliquer les modifications
                        </button>
                        <button
                            className="rounded border border-slate-500 px-4 py-2 text-sm"
                            onClick={onCancelEdit}
                            type="button"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {activeJob.status === "indexed" && (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-50">
                    <div className="font-semibold">Indexation terminée</div>
                    <div className="text-sm text-emerald-50/80 break-all">
                        {activeJob.final_relative_path}
                    </div>
                </div>
            )}
        </div>
    )
}
