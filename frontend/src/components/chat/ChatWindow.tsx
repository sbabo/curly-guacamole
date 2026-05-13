type Message = {
    role: string
    content: string
}

export default function ChatWindow({
    messages
}: {
    messages: Message[]
}) {

    return (

        <div className="flex-1 overflow-y-auto p-4">

            {messages.map((msg, index) => (

                <div
                    key={index}
                    className={`mb-4 ${
                        msg.role === "user"
                            ? "text-blue-400"
                            : "text-green-400"
                    }`}
                >
                    <strong>
                        {msg.role === "user" ? "Vous" : "LLM"}
                    </strong>

                    <p>{msg.content}</p>

                </div>
            ))}

        </div>
    )
}