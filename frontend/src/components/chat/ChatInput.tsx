import { useState } from "react"

export default function ChatInput({
    onSend
}: Readonly<{
    onSend: (message: string) => void
}>) {

    // État local du message en cours de saisie.
    const [message, setMessage] = useState("")

    function submit() {

        // Empêche l'envoi de messages vides.
        if (!message) return

        // Envoie le message au composant parent, puis vide l'input.
        onSend(message)

        setMessage("")
    }

    return (

        <div className="flex gap-3 border-t border-slate-800 bg-slate-950/70 p-4 backdrop-blur">

            <input
                // Input contrôlé, lié au state local.
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-amber-400/60"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
            />

            <button
                className="rounded-2xl bg-amber-400 px-5 font-semibold text-slate-950 transition hover:bg-amber-300"
                onClick={submit}
                type="button"
            >
                Envoyer
            </button>

        </div>
    )
}