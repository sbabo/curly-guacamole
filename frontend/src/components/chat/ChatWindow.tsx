import type { GuidedStage, SearchHit } from "../../services/api"
import GuidedSearchCard from "./GuidedSearchCard"

type Message = {
    id: string
    role: string
    content: string
    hits?: SearchHit[]
    guided?: GuidedStage
    guessedFields?: Record<string, string>
    guidedResolved?: boolean
}

export default function ChatWindow({
    messages,
    onGuidedSubmit,
}: Readonly<{
    messages: Message[]
    onGuidedSubmit: (messageId: string, docType: string, fieldValues: Record<string, string>) => void
}>) {

    return (

        // Liste de messages scrollable, affichée dans l'ordre de conversation.
        <div className="flex-1 overflow-y-auto p-4">

            {messages.map((msg, index) => (

                <div key={msg.id ?? msg.role + msg.content + index}>

                    <div
                        className={`mb-4 flex ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl border px-4 py-3 shadow-lg ${
                                msg.role === "user"
                                    ? "border-sky-400/30 bg-sky-400/10 text-sky-50"
                                    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
                            }`}
                        >
                            <div className="mb-1 text-[10px] uppercase tracking-[0.28em] opacity-70">
                                {msg.role === "user" ? "Vous" : "Assistant"}
                            </div>
                            <p className="whitespace-pre-wrap leading-6">{msg.content}</p>

                            {msg.hits && msg.hits.length > 0 && (
                                <ul className="mt-3 flex flex-col gap-2">
                                    {msg.hits.map((hit) => (
                                        <li
                                            key={hit.document_id}
                                            className="rounded-xl border border-emerald-300/20 bg-slate-900/40 px-3 py-2"
                                        >
                                            <div className="font-semibold text-white">{hit.title}</div>
                                            {hit.describe && (
                                                <div className="text-sm text-emerald-100/70">{hit.describe}</div>
                                            )}
                                            <div className="text-xs text-emerald-100/50">{hit.file_path}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                    </div>

                    {msg.guided && !msg.guidedResolved && (
                        <div className="mb-4 flex justify-start">
                            <GuidedSearchCard
                                guided={msg.guided}
                                guessedFields={msg.guessedFields ?? {}}
                                disabled={false}
                                onSubmit={(docType, fieldValues) => onGuidedSubmit(msg.id, docType, fieldValues)}
                            />
                        </div>
                    )}

                </div>
            ))}

        </div>
    )
}