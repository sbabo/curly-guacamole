import { useState } from "react"

export default function ChatInput({
    onSend
}: {
    onSend: (message: string) => void
}) {

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

        <div className="flex p-4 border-t border-slate-700">

            <input
                // Controlled input bound to local state.
                className="flex-1 bg-slate-800 p-3 rounded"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
            />

            <button
                className="ml-2 bg-blue-600 px-4 rounded"
                onClick={submit}
            >
                Envoyer
            </button>

        </div>
    )
}