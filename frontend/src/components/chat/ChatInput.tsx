import { useRef, useState } from "react"

export default function ChatInput({
    onSend,
    onUploadAndIngest,
}: Readonly<{
    onSend: (message: string) => void
    onUploadAndIngest: (file: File, message: string) => void
}>) {

    // État local du message en cours de saisie.
    const [message, setMessage] = useState("")

    // Fichier attaché en attente d'envoi (déclenche l'ingestion à la place de la recherche).
    const [attachedFile, setAttachedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    function submit() {

        // Si un fichier est attaché, le message sert d'intention transmise à l'ingestion.
        if (attachedFile) {
            onUploadAndIngest(attachedFile, message)
            setAttachedFile(null)
            setMessage("")
            return
        }

        // Empêche l'envoi de messages vides.
        if (!message) return

        // Envoie le message au composant parent, puis vide l'input.
        onSend(message)

        setMessage("")
    }

    return (

        <div className="border-t border-slate-800 bg-slate-950/70 p-4 backdrop-blur">

            {attachedFile && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200">
                    <span className="flex-1 truncate">{attachedFile.name}</span>
                    <button
                        className="text-slate-400 hover:text-white"
                        onClick={() => setAttachedFile(null)}
                        type="button"
                        aria-label="Retirer le fichier"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="flex gap-3">

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                        const nextFile = e.target.files?.[0]
                        if (nextFile) setAttachedFile(nextFile)
                        e.target.value = ""
                    }}
                />

                <button
                    className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 font-semibold text-amber-400 transition hover:bg-slate-800"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    aria-label="Ajouter un document"
                >
                    +
                </button>

                <input
                    // Input contrôlé, lié au state local.
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-amber-400/60"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={attachedFile ? "Décris le document (optionnel)..." : "Message..."}
                />

                <button
                    className="rounded-2xl bg-amber-400 px-5 font-semibold text-slate-950 transition hover:bg-amber-300"
                    onClick={submit}
                    type="button"
                >
                    Envoyer
                </button>

            </div>

        </div>
    )
}