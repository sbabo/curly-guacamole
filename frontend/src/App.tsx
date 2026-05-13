import { useEffect, useState } from "react"

import ChatWindow from "./components/chat/ChatWindow"
import ChatInput from "./components/chat/ChatInput"
import FileTree from "./components/sidebar/FileTree"

import {
    sendMessage,
    fetchFiles
} from "./services/api"

type Message = {
    role: string
    content: string
}

type FileNode = {
    name: string
    type: "file" | "folder"
    children?: FileNode[]
}

function App() {

    const [messages, setMessages] = useState<Message[]>([])
    const [files, setFiles] = useState<FileNode[]>([])

    useEffect(() => {

        async function init() {

            try {

                const data: FileNode[] = await fetchFiles()

                setFiles(data)

            } catch (err) {

                console.error(err)
            }
        }

        init()

    }, [])

    async function handleSend(message: string) {

        const updatedMessages: Message[] = [
            ...messages,
            {
                role: "user",
                content: message
            }
        ]

        setMessages(updatedMessages)

        try {

            const response = await sendMessage(message)

            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: response.reply
                }
            ])

        } catch (err) {

            console.error(err)
        }
    }

    return (

        <div className="h-screen flex bg-slate-950 text-white">

            <div className="w-72 border-r border-slate-800 bg-slate-900 overflow-y-auto">

                <FileTree files={files} />

            </div>

            <div className="flex-1 flex flex-col">

                <div className="border-b border-slate-800 p-4 font-bold">
                    LLM Panel
                </div>

                <ChatWindow messages={messages} />

                <ChatInput onSend={handleSend} />

            </div>

        </div>
    )
}

export default App