import { useEffect, useRef, useState } from "react"

import ChatInput from "../components/chat/ChatInput"
import ChatWindow from "../components/chat/ChatWindow"
import IngestionProgressCard from "../components/ingestion/IngestionProgressCard"
import FileTree from "../components/sidebar/FileTree"

import {
    answerIngestionQuestion,
    confirmIngestion,
    fetchDocuments,
    sendSearchMessage,
    startIngestionFromUpload,
    subscribeIngestionEvents,
    updateIngestionDraft,
    uploadDocument,
    type DocumentItem,
    type ExtractionField,
    type IngestJobSnapshot,
} from "../services/api"

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

    // Historique du chat affiché dans le panneau principal.
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
    // Références servant à éviter les doublons de messages lors du stream d'ingestion.
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
        // Synchronise le brouillon éditable avec l'état du job actif.
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
        // Coupe proprement le flux SSE au démontage du composant.
        return () => {
            cleanupStreamRef.current?.()
        }
    }, [])

    useEffect(() => {
        if (!activeJob?.job_id) {
            return undefined
        }

        // Abonne le front aux événements d'ingestion du job courant.
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

        // Recharge la liste affichée après upload / confirmation.
        const data = await fetchDocuments()
        setDocuments(data)
    }

    async function handleUpload(file: File) {

        try {

            // Upload dans le dossier provisoire, puis rafraîchissement de la sidebar.
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
        // Met à jour une ligne du brouillon (obligatoire ou facultatif) sans muter l'état.
        const updater = section === "mandatory" ? setDraftMandatoryFields : setDraftOptionalFields
        updater((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
    }

    function addDraftField(section: "mandatory" | "optional") {
        // Ajoute une nouvelle paire clé/valeur vide dans le brouillon.
        const updater = section === "mandatory" ? setDraftMandatoryFields : setDraftOptionalFields
        updater((prev) => [...prev, { field_name: "", field_value: "" }])
    }

    async function handleApplyDraftChanges() {
        const sessionId = activeJob?.session_id ?? activeJob?.job_id
        if (!sessionId) return

        try {
            setIsIngestionBusy(true)

            // Évite d'envoyer des champs sans clé au backend.
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

        // Affichage optimiste du message utilisateur avant la réponse backend.
        const updatedMessages: Message[] = [
            ...messages,
            createMessage("user", message)
        ]

        setMessages(updatedMessages)

        try {

            const response = await sendSearchMessage(message)

            // Ajoute la réponse backend à la conversation.
            setMessages(prev => [
                ...prev,
                createMessage("assistant", response.reply ?? "Réponse indisponible")
            ])

        } catch (err) {

            console.error(err)
        }
    }

    return (

        // Layout principal en deux colonnes : arborescence à gauche, chat à droite.
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
                    <IngestionProgressCard
                        activeJob={activeJob}
                        ingestionAnswer={ingestionAnswer}
                        isIngestionBusy={isIngestionBusy}
                        isEditingDraft={isEditingDraft}
                        draftDetectedType={draftDetectedType}
                        draftMandatoryFields={draftMandatoryFields}
                        draftOptionalFields={draftOptionalFields}
                        onIngestionAnswerChange={setIngestionAnswer}
                        onAnswerIngestion={handleAnswerIngestion}
                        onConfirmIngestion={handleConfirmIngestion}
                        onEditDraft={() => setIsEditingDraft(true)}
                        onApplyDraftChanges={handleApplyDraftChanges}
                        onCancelEdit={() => setIsEditingDraft(false)}
                        onUpdateDraftField={updateDraftField}
                        onAddDraftField={addDraftField}
                        onDetectedTypeChange={setDraftDetectedType}
                    />
                )}

                <ChatWindow messages={messages} />

                <ChatInput onSend={handleSend} />

            </div>

        </div>
    )
}

export default App