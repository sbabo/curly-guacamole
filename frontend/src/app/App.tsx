import { useEffect, useRef, useState } from "react"

import ChatInput from "../components/chat/ChatInput"
import ChatWindow from "../components/chat/ChatWindow"
import IngestionProgressCard from "../components/ingestion/IngestionProgressCard"
import FileTree from "../components/sidebar/FileTree"
import { useAuth } from "../hooks/useAuth"
import AdminUsersPage from "../pages/AdminUsersPage"
import FirstUserPage from "../pages/FirstUserPage"
import LoginPage from "../pages/LoginPage"
import { fetchCurrentUserRights } from "../services/administration"
import { fetchFirstUserStatus } from "../services/auth"

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
    type GuidedStage,
    type IngestJobSnapshot,
    type SearchHit,
} from "../services/api"

import "../styles/access.css"

type Message = {
    id: string
    role: string
    content: string
    hits?: SearchHit[]
    guided?: GuidedStage
    guessedFields?: Record<string, string>
    guidedResolved?: boolean
}

type BootstrapState = "loading" | "first-user" | "login"
type WorkspaceView = "chat" | "admin"

function createMessage(role: string, content: string, extra: Partial<Message> = {}): Message {
    return {
        id: crypto.randomUUID(),
        role,
        content,
        ...extra,
    }
}

function App() {
    const { token, login, logout } = useAuth()
    const [bootstrapState, setBootstrapState] = useState<BootstrapState>("loading")
    const [canManageUsers, setCanManageUsers] = useState(false)
    const [activeView, setActiveView] = useState<WorkspaceView>("chat")
    const [messages, setMessages] = useState<Message[]>([])
    const [documents, setDocuments] = useState<SearchHit[] | undefined>(undefined)
    const [selectedTmpPath, setSelectedTmpPath] = useState<string | null>(null)
    const [activeJob, setActiveJob] = useState<IngestJobSnapshot | null>(null)
    const [ingestionAnswer, setIngestionAnswer] = useState("")
    const [intentionMessage, setIntentionMessage] = useState("")
    const [isIngestionBusy, setIsIngestionBusy] = useState(false)
    const [isEditingDraft, setIsEditingDraft] = useState(false)
    const [draftDetectedType, setDraftDetectedType] = useState("")
    const [draftMandatoryFields, setDraftMandatoryFields] = useState<ExtractionField[]>([])
    const [draftOptionalFields, setDraftOptionalFields] = useState<ExtractionField[]>([])
    const lastJobMessageRef = useRef("")
    const lastQuestionRef = useRef("")
    const cleanupStreamRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        let isMounted = true

        async function init() {
            try {
                const hasUsers = await fetchFirstUserStatus()
                if (isMounted) {
                    setBootstrapState(hasUsers ? "login" : "first-user")
                }
            } catch (error) {
                console.error(error)
                if (isMounted) {
                    setBootstrapState("login")
                }
            }
        }

        void init()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (!token) {
            setCanManageUsers(false)
            setActiveView("chat")
            setMessages([])
            setDocuments(undefined)
            setSelectedTmpPath(null)
            setActiveJob(null)
            setIngestionAnswer("")
            setIntentionMessage("")
            setIsIngestionBusy(false)
            setIsEditingDraft(false)
            setDraftDetectedType("")
            setDraftMandatoryFields([])
            setDraftOptionalFields([])
            cleanupStreamRef.current?.()
            cleanupStreamRef.current = null
            return
        }

        let isMounted = true

        async function loadRights() {
            try {
                const rights = await fetchCurrentUserRights()
                if (!isMounted) {
                    return
                }

                setCanManageUsers(rights.can_manage_users)
                if (!rights.can_manage_users) {
                    setActiveView("chat")
                }
            } catch (error) {
                console.error(error)
                if (isMounted) {
                    logout()
                    setCanManageUsers(false)
                    setActiveView("chat")
                }
            }
        }

        void loadRights()

        return () => {
            isMounted = false
        }
    }, [logout, token])

    useEffect(() => {
        if (!token) {
            return
        }

        // ne pas charger les documents par défaut ici — ils seront définis
        // uniquement après une recherche effectuée (via `handleSend`).
    }, [token])

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
                    setMessages((prev) => [...prev, createMessage("assistant", job.message)])
                }

                if (job.next_question && job.next_question !== lastQuestionRef.current) {
                    lastQuestionRef.current = job.next_question
                    setMessages((prev) => [...prev, createMessage("assistant", job.next_question ?? "")])
                }

                if (job.error) {
                    setMessages((prev) => [...prev, createMessage("assistant", job.error ?? "")])
                }
            },
            (errorMessage) => {
                setMessages((prev) => [...prev, createMessage("assistant", errorMessage)])
            }
        )

        return () => {
            cleanupStreamRef.current?.()
            cleanupStreamRef.current = null
        }
    }, [activeJob?.job_id])

    async function refreshDocuments() {
        // Récupère la liste complète des fichiers stockés côté serveur mais
        // ne la publie pas dans la colonne de recherche. La colonne de gauche
        // affiche uniquement les résultats d'une recherche (state `documents`).
        await fetchDocuments()
    }

    async function handleUploadAndIngest(file: File, message: string) {
        try {
            setIsIngestionBusy(true)

            const uploaded = await uploadDocument(file)
            setSelectedTmpPath(uploaded.relative_path)
            setIntentionMessage(message)
            await refreshDocuments()

            const displayMessage = message.trim() || `Document ajouté: ${uploaded.name}`
            setMessages((prev) => [...prev, createMessage("user", displayMessage)])

            const response = await startIngestionFromUpload(uploaded.relative_path)
            setActiveJob(response.job)
            lastJobMessageRef.current = response.job.message
            lastQuestionRef.current = ""

            setMessages((prev) => [
                ...prev,
                createMessage("assistant", "Le traitement d'ingestion a démarré. Je te tiens au courant dès que l'extraction est prête."),
            ])
        } catch (error) {
            console.error(error)
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

            setActiveJob((prev) => prev ? {
                ...prev,
                status: response.status === "ready_to_index" ? "ready_for_validation" : "waiting_user_input",
                mandatory_fields: response.mandatory_fields,
                optional_fields: response.optional_fields,
                missing_mandatory_keys: response.missing_mandatory_keys,
                next_question: response.next_question,
            } : prev)

            setIngestionAnswer("")

            setMessages((prev) => [
                ...prev,
                createMessage("assistant", response.next_question ? response.next_question : "Merci, l'extraction continue."),
            ])
        } catch (error) {
            console.error(error)
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
                describe: intentionMessage.trim() || `Document ajouté depuis ${selectedTmpPath}`,
                meta: {},
                acl_groups: "c3",
                acl_level: "1",
                is_and_logic: true,
                user_id: 3,
            })

            setActiveJob((prev) => prev ? {
                ...prev,
                status: "indexed",
                message: "Document indexé avec succès.",
                final_relative_path: result.final_relative_path,
                document_id: result.ingest.document_id,
                embedding_ids: result.ingest.embedding_ids,
            } : prev)

            setMessages((prev) => [
                ...prev,
                createMessage("assistant", `Indexation terminée pour ${result.final_relative_path}`),
            ])

            setIntentionMessage("")
            await refreshDocuments()
        } catch (error) {
            console.error(error)
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
            setMessages((prev) => [...prev, createMessage("assistant", "Le brouillon a été mis à jour.")])
            setIsEditingDraft(false)
        } catch (error) {
            console.error(error)
        } finally {
            setIsIngestionBusy(false)
        }
    }

    async function handleSend(message: string) {
        const updatedMessages: Message[] = [...messages, createMessage("user", message)]
        setMessages(updatedMessages)

        try {
            const response = await sendSearchMessage(message)
            // Mettre à jour la colonne de gauche avec les hits de la recherche.
            setDocuments(response.hits ?? [])

            setMessages((prev) => [
                ...prev,
                createMessage("assistant", response.reply ?? "Réponse indisponible", {
                    hits: response.hits,
                    guided: response.guided ?? undefined,
                    guessedFields: response.guessed_fields,
                }),
            ])
        } catch (error) {
            console.error(error)
        }
    }

    async function handleGuidedSubmit(messageId: string, docType: string, fieldValues: Record<string, string>) {
        try {
            const response = await sendSearchMessage("", docType, fieldValues)

            // Mettre à jour la colonne de gauche avec les hits de la recherche guidée
            setDocuments(response.hits ?? [])

            setMessages((prev) =>
                prev.map((msg) => (msg.id === messageId ? { ...msg, guidedResolved: true } : msg))
            )

            setMessages((prev) => [
                ...prev,
                createMessage("assistant", response.reply ?? "Réponse indisponible", {
                    hits: response.hits,
                    guided: response.guided ?? undefined,
                    guessedFields: response.guessed_fields,
                }),
            ])
        } catch (error) {
            console.error(error)
        }
    }

    if (bootstrapState === "loading") {
        return (
            <main className="screen-shell">
                <section className="screen-panel screen-panel--narrow">
                    <div className="screen-hero">
                        <span className="screen-kicker">Intelli'GED</span>
                        <h1 className="screen-title" style={{ fontSize: "2.3rem" }}>Préparation de l'espace de travail</h1>
                        <p className="screen-copy">Vérification de l'état du premier utilisateur et des droits d'accès.</p>
                    </div>
                </section>
            </main>
        )
    }

    if (!token && bootstrapState === "first-user") {
        return <FirstUserPage onCreated={() => setBootstrapState("login")} />
    }

    if (!token) {
        return <LoginPage onLoginSuccess={login} />
    }

    if (activeView === "admin" && canManageUsers) {
        return <AdminUsersPage onBack={() => setActiveView("chat")} onLogout={logout} />
    }

    return (
        <div className="h-screen flex bg-slate-950 text-white">
            <div className="w-72 border-r border-slate-800 bg-slate-900 overflow-y-auto">
                <FileTree hits={documents} />
            </div>

            <div className="flex-1 flex flex-col">
                <div className="border-b border-slate-800 p-4 font-bold flex items-center justify-between gap-4">
                    <div>Intelli'GED — Reprenez le pouvoir sur vos documents...</div>
                    <div className="flex items-center gap-2">
                        {canManageUsers ? (
                            <button
                                onClick={() => setActiveView("admin")}
                                className="px-4 py-2 text-sm font-medium text-amber-200 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors"
                            >
                                Administration
                            </button>
                        ) : null}
                        <button
                            onClick={logout}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                        >
                            Se déconnecter
                        </button>
                    </div>
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

                <ChatWindow messages={messages} onGuidedSubmit={handleGuidedSubmit} />
                <ChatInput onSend={handleSend} onUploadAndIngest={handleUploadAndIngest} />
            </div>
        </div>
    )
}

export default App