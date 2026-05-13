import { useState } from "react"

export default function ChatInput({
    onSend
}: {
    onSend: (message: string) => void
}) {

    const [message, setMessage] = useState("")

    function submit() {

        if (!message) return

        onSend(message)

        setMessage("")
    }

    return (

        <div className="flex p-4 border-t border-slate-700">

            <input
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