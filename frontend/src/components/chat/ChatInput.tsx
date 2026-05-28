import { useState } from "react"

export default function ChatInput({
    onSend
}: Readonly<{
    onSend: (message: string) => void
}>) {

    // Local state for the message currently typed by the user.
    const [message, setMessage] = useState("")

    function submit() {

        // Prevent sending empty messages.
        if (!message) return

        // Send the message to the parent component, then clear the input.
        onSend(message)

        setMessage("")
    }

    return (

        <div className="flex gap-3 border-t border-slate-800 bg-slate-950/70 p-4 backdrop-blur">

            <input
                // Controlled input bound to local state.
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-amber-400/60"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
            />

            <button
                className="rounded-2xl bg-amber-400 px-5 font-semibold text-slate-950 transition hover:bg-amber-300"
                onClick={submit}
            >
                Envoyer
            </button>

        </div>
    )
}