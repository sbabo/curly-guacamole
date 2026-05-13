const API_URL = "http://127.0.0.1:8000"

export async function sendMessage(message: string) {

    const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message
        })
    })

    return response.json()
}

export async function fetchFiles() {

    const response = await fetch(`${API_URL}/files`)

    return response.json()
}