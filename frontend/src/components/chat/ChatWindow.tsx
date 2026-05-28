type Message = {
    role: string
    content: string
}

export default function ChatWindow({
    messages
}: Readonly<{
    messages: Message[]
}>) {

    return (

        // Scrollable message list rendered in chat order.
        <div className="flex-1 overflow-y-auto p-4">

            {messages.map((msg, index) => (

                <div
                    key={msg.role + msg.content + index}
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
                    </div>

                </div>
            ))}

        </div>
    )
}