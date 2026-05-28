import { useEffect, useRef, useState } from "react"

import ChatInput from "./components/chat/ChatInput"
import ChatWindow from "./components/chat/ChatWindow"
import FileTree from "./components/sidebar/FileTree"

import {
    answerIngestionQuestion,
    confirmIngestion,
    fetchDocuments,
    sendSearchMessage,
    startIngestionFromUpload,
    subscribeIngestionEvents,
    updateIngestionDraft,
    uploadDocument,
    type ExtractionField,
    type DocumentItem,
    type IngestJobSnapshot,
} from "./services/api"

type Message = {
    id: string
    role: string
    content: string
}

function createMessage(role: string, content: string): Message {
    return {
        id: crypto.randomUUID(),
        role,
        content,
    }
}

function App() {

    // Chat history rendered in the main panel.
    const [messages, setMessages] = useState<Message[]>([])
    // Documents provisoires et définitifs pour la sidebar.
    const [documents, setDocuments] = useState<DocumentItem[]>([])
    const [selectedTmpPath, setSelectedTmpPath] = useState<string | null>(null)
    const [activeJob, setActiveJob] = useState<IngestJobSnapshot | null>(null)
    const [ingestionAnswer, setIngestionAnswer] = useState("")
    const [isIngestionBusy, setIsIngestionBusy] = useState(false)
    const [isEditingDraft, setIsEditingDraft] = useState(false)
    const [draftDetectedType, setDraftDetectedType] = useState("")
    const [draftMandatoryFields, setDraftMandatoryFields] = useState<ExtractionField[]>([])
    const [draftOptionalFields, setDraftOptionalFields] = useState<ExtractionField[]>([])
    const lastJobMessageRef = useRef("")
    const lastQuestionRef = useRef("")
    const cleanupStreamRef = useRef<(() => void) | null>(null)

    useEffect(() => {

        // Charge les documents visibles dans la sidebar au premier rendu.
        async function init() {

            try {

                const data = await fetchDocuments()

                setDocuments(data)

            } catch (err) {

                console.error(err)
            }
        }

        init()

    }, [])

    useEffect(() => {
        if (!activeJob) {
            setDraftDetectedType("")
            setDraftMandatoryFields([])
            setDraftOptionalFields([])
            return
        }

        setDraftDetectedType(activeJob.detected_type ?? "")
        setDraftMandatoryFields(activeJob.mandatory_fields.map((field) => ({ ...field })))
        setDraftOptionalFields(activeJob.optional_fields.map((field) => ({ ...field })))
    }, [activeJob?.detected_type, activeJob?.mandatory_fields, activeJob?.optional_fields])

    useEffect(() => {
        return () => {
            cleanupStreamRef.current?.()
        }
    }, [])

    useEffect(() => {
        if (!activeJob?.job_id) {
            return undefined
        }

        cleanupStreamRef.current?.()
        cleanupStreamRef.current = subscribeIngestionEvents(
            activeJob.job_id,
            (job) => {
                setActiveJob(job)

                if (job.message && job.message !== lastJobMessageRef.current) {
                    lastJobMessageRef.current = job.message
                    setMessages(prev => [
                        ...prev,
                        createMessage("assistant", job.message),
                    ])
                }

                if (job.next_question && job.next_question !== lastQuestionRef.current) {
                    lastQuestionRef.current = job.next_question
                    setMessages(prev => [
                        ...prev,
                        createMessage("assistant", job.next_question ?? ""),
                    ])
                }

                if (job.error) {
                    setMessages(prev => [
                        ...prev,
                        createMessage("assistant", job.error ?? ""),
                    ])
                }
            },
            (errorMessage) => {
                setMessages(prev => [
                    ...prev,
                    createMessage("assistant", errorMessage),
                ])
            }
        )

        return () => {
            cleanupStreamRef.current?.()
            cleanupStreamRef.current = null
        }
    }, [activeJob?.job_id])

    async function refreshDocuments() {

        const data = await fetchDocuments()
        setDocuments(data)
    }

    async function handleUpload(file: File) {

        try {

            const uploaded = await uploadDocument(file)

            setSelectedTmpPath(uploaded.relative_path)
            await refreshDocuments()
            setMessages(prev => [
                ...prev,
                createMessage("assistant", `Document ajouté en provisoire: ${uploaded.name}`),
            ])

        } catch (err) {

            console.error(err)
        }
    }

    async function handleStartIngestion() {

        if (!selectedTmpPath) return

        try {

            setIsIngestionBusy(true)

            const response = await startIngestionFromUpload(selectedTmpPath)
            setActiveJob(response.job)
            lastJobMessageRef.current = response.job.message
            lastQuestionRef.current = ""

            setMessages(prev => [
                ...prev,
                createMessage("assistant", "Le traitement d'ingestion a démarré. Je te tiens au courant dès que l'extraction est prête."),
            ])

        } catch (err) {

            console.error(err)
        } finally {

            setIsIngestionBusy(false)
        }
    }

    async function handleAnswerIngestion() {

        const sessionId = activeJob?.session_id ?? activeJob?.job_id
        if (!sessionId || !ingestionAnswer.trim()) return

        try {

            setIsIngestionBusy(true)

            const response = await answerIngestionQuestion(sessionId, ingestionAnswer.trim())

            setActiveJob(prev => prev ? {
                ...prev,
                status: response.status === "ready_to_index" ? "ready_for_validation" : "waiting_user_input",
                mandatory_fields: response.mandatory_fields,
                optional_fields: response.optional_fields,
                missing_mandatory_keys: response.missing_mandatory_keys,
                next_question: response.next_question,
            } : prev)

            setIngestionAnswer("")

            setMessages(prev => [
                ...prev,
                createMessage("assistant", response.next_question ? response.next_question : "Merci, l'extraction continue."),
            ])

        } catch (err) {

            console.error(err)
        } finally {

            setIsIngestionBusy(false)
        }
    }

    async function handleConfirmIngestion() {

        const sessionId = activeJob?.session_id ?? activeJob?.job_id
        if (!sessionId || !selectedTmpPath) return

        try {

            setIsIngestionBusy(true)

            const fileName = selectedTmpPath.split("/").pop() ?? "document"
            const title = fileName.replace(/\.[^.]+$/, "") || fileName

            const result = await confirmIngestion(sessionId, {
                title,
                describe: `Document ajouté depuis ${selectedTmpPath}`,
                meta: {},
                acl_groups: "c3",
                acl_level: "1",
                is_and_logic: true,
                user_id: 3,
            })

            setActiveJob(prev => prev ? {
                ...prev,
                status: "indexed",
                message: "Document indexé avec succès.",
                final_relative_path: result.final_relative_path,
                document_id: result.ingest.document_id,
                embedding_ids: result.ingest.embedding_ids,
            } : prev)

            setMessages(prev => [
                ...prev,
                createMessage("assistant", `Indexation terminée pour ${result.final_relative_path}`),
            ])

            await refreshDocuments()

        } catch (err) {

            console.error(err)
        } finally {

            setIsIngestionBusy(false)
        }
    }

    function updateDraftField(
        section: "mandatory" | "optional",
        index: number,
        key: "field_name" | "field_value",
        value: string,
    ) {
        const updater = section === "mandatory" ? setDraftMandatoryFields : setDraftOptionalFields
        updater((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
    }

    function addDraftField(section: "mandatory" | "optional") {
        const updater = section === "mandatory" ? setDraftMandatoryFields : setDraftOptionalFields
        updater((prev) => [...prev, { field_name: "", field_value: "" }])
    }

    async function handleApplyDraftChanges() {
        const sessionId = activeJob?.session_id ?? activeJob?.job_id
        if (!sessionId) return

        try {
            setIsIngestionBusy(true)

            const cleanedMandatory = draftMandatoryFields.filter((field) => field.field_name.trim())
            const cleanedOptional = draftOptionalFields.filter((field) => field.field_name.trim())

            const response = await updateIngestionDraft(sessionId, {
                detected_type: draftDetectedType || null,
                mandatory_fields: cleanedMandatory,
                optional_fields: cleanedOptional,
            })

            setActiveJob(response.job)
            setMessages((prev) => [
                ...prev,
                createMessage("assistant", "Le brouillon a été mis à jour."),
            ])
            setIsEditingDraft(false)
        } catch (err) {
            console.error(err)
        } finally {
            setIsIngestionBusy(false)
        }
    }

    async function handleSend(message: string) {

        // Optimistically show the user message immediately.
        const updatedMessages: Message[] = [
            ...messages,
            createMessage("user", message)
        ]

        setMessages(updatedMessages)

        try {

            const response = await sendSearchMessage(message)

            // Append backend reply to the conversation.
            setMessages(prev => [
                ...prev,
                createMessage("assistant", response.reply ?? "Réponse indisponible")
            ])

        } catch (err) {

            console.error(err)
        }
    }

    return (

        // Two-column layout: file tree (left) and chat panel (right).
        <div className="h-screen flex bg-slate-950 text-white">

            <div className="w-72 border-r border-slate-800 bg-slate-900 overflow-y-auto">
                <FileTree
                    documents={documents}
                    selectedTmpPath={selectedTmpPath}
                    onUpload={handleUpload}
                    onSelectTmp={setSelectedTmpPath}
                    onStartIngestion={handleStartIngestion}
                    isIngestionBusy={isIngestionBusy}
                />

            </div>

            <div className="flex-1 flex flex-col">

                <div className="border-b border-slate-800 p-4 font-bold">
                    Intelli'GED — Reprenez le pouvoir sur vos documents...
                </div>

                {activeJob && (
                    <div className="mx-4 mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-50 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs uppercase tracking-[0.28em] text-amber-200/70">Ingestion en cours</div>
                                <div className="mt-1 font-semibold text-white break-all">{activeJob.relative_tmp_path}</div>
                                <div className="mt-1 text-amber-100/80">{activeJob.message}</div>
                                <div className="mt-2 text-xs text-amber-100/70">
                                    Type détecté: <span className="font-semibold text-amber-100">{activeJob.detected_type ?? "non défini"}</span>
                                </div>
                            </div>
                            <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100">
                                {activeJob.status}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Mots-clés obligatoires recherchés</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {activeJob.mandatory_keys_expected.map((keyName) => (
                                        <span key={keyName} className="rounded-full border border-amber-300/30 px-2 py-1 text-xs">
                                            {keyName}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Mots-clés facultatifs recherchés</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {activeJob.optional_keys_expected.map((keyName) => (
                                        <span key={keyName} className="rounded-full border border-sky-300/30 px-2 py-1 text-xs">
                                            {keyName}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Valeurs obligatoires détectées</div>
                                <div className="mt-2 space-y-2">
                                    {activeJob.mandatory_fields.map((field) => (
                                        <div key={`mandatory-${field.field_name}`} className="rounded border border-slate-700 px-2 py-1 text-xs">
                                            <span className="font-semibold text-amber-200">{field.field_name}</span>: {field.field_value || "(vide)"}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Valeurs facultatives détectées</div>
                                <div className="mt-2 space-y-2">
                                    {activeJob.optional_fields.map((field) => (
                                        <div key={`optional-${field.field_name}`} className="rounded border border-slate-700 px-2 py-1 text-xs">
                                            <span className="font-semibold text-sky-200">{field.field_name}</span>: {field.field_value || "(vide)"}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {activeJob.next_question && activeJob.status === "waiting_user_input" && (
                            <div className="mt-4 space-y-3">
                                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-slate-100">
                                    {activeJob.next_question}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500"
                                        value={ingestionAnswer}
                                        onChange={(event) => setIngestionAnswer(event.target.value)}
                                        placeholder="Réponse à la question d'extraction"
                                    />
                                    <button
                                        className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={handleAnswerIngestion}
                                        disabled={!ingestionAnswer.trim() || isIngestionBusy}
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
                                    <div className="text-sm text-emerald-50/80">Les champs obligatoires sont complets. Tu peux confirmer l'indexation.</div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="rounded-xl border border-emerald-200/60 px-4 py-2 font-semibold text-emerald-50 transition hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() => setIsEditingDraft(true)}
                                        disabled={isIngestionBusy}
                                    >
                                        Modifier un élément
                                    </button>
                                    <button
                                        className="rounded-xl bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={handleConfirmIngestion}
                                        disabled={isIngestionBusy}
                                    >
                                        Confirmer
                                    </button>
                                </div>
                            </div>
                        )}

                        {isEditingDraft && (
                            <div className="mt-4 space-y-4 rounded-xl border border-amber-300/30 bg-slate-950/60 p-4">
                                <div>
                                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/80">Type de contrat</div>
                                    <div className="flex flex-wrap gap-3">
                                        {activeJob.detected_type_options.map((option) => (
                                            <label key={option} className="inline-flex items-center gap-2 text-sm">
                                                <input
                                                    type="radio"
                                                    name="detected-type"
                                                    checked={draftDetectedType === option}
                                                    onChange={() => setDraftDetectedType(option)}
                                                />
                                                <span>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/80">Paires obligatoire clé/valeur</div>
                                        <div className="space-y-2">
                                            {draftMandatoryFields.map((field, index) => (
                                                <div
                                                    key={`draft-m-${field.field_name || "vide"}-${index}`}
                                                    className="grid grid-cols-2 gap-2"
                                                >
                                                    <input
                                                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                                        value={field.field_name}
                                                        onChange={(event) => updateDraftField("mandatory", index, "field_name", event.target.value)}
                                                        placeholder="Clé"
                                                    />
                                                    <input
                                                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                                        value={field.field_value}
                                                        onChange={(event) => updateDraftField("mandatory", index, "field_value", event.target.value)}
                                                        placeholder="Valeur"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            className="mt-2 rounded border border-amber-300/40 px-3 py-1 text-xs"
                                            onClick={() => addDraftField("mandatory")}
                                            type="button"
                                        >
                                            Ajouter obligatoire
                                        </button>
                                    </div>

                                    <div>
                                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/80">Paires facultative clé/valeur</div>
                                        <div className="space-y-2">
                                            {draftOptionalFields.map((field, index) => (
                                                <div
                                                    key={`draft-o-${field.field_name || "vide"}-${index}`}
                                                    className="grid grid-cols-2 gap-2"
                                                >
                                                    <input
                                                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                                        value={field.field_name}
                                                        onChange={(event) => updateDraftField("optional", index, "field_name", event.target.value)}
                                                        placeholder="Clé"
                                                    />
                                                    <input
                                                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                                                        value={field.field_value}
                                                        onChange={(event) => updateDraftField("optional", index, "field_value", event.target.value)}
                                                        placeholder="Valeur"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            className="mt-2 rounded border border-sky-300/40 px-3 py-1 text-xs"
                                            onClick={() => addDraftField("optional")}
                                            type="button"
                                        >
                                            Ajouter facultatif
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        className="rounded bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                                        onClick={handleApplyDraftChanges}
                                        disabled={isIngestionBusy}
                                        type="button"
                                    >
                                        Appliquer les modifications
                                    </button>
                                    <button
                                        className="rounded border border-slate-500 px-4 py-2 text-sm"
                                        onClick={() => setIsEditingDraft(false)}
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
                                <div className="text-sm text-emerald-50/80 break-all">{activeJob.final_relative_path}</div>
                            </div>
                        )}

                        {activeJob.error && (
                            <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-rose-50">
                                {activeJob.error}
                            </div>
                        )}
                    </div>
                )}

                <ChatWindow messages={messages} />

                <ChatInput onSend={handleSend} />

            </div>

        </div>
    )
}

export default App