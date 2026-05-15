const API_URL = "http://127.0.0.1:8000"

export async function sendMessage(message: string) {

    // Send the user prompt to the backend chat endpoint.
    const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message
        })
    })

    // Expected shape: { reply: string }.
    return response.json()
}

export async function fetchFiles() {

    // Retrieve the file tree shown in the left sidebar.
    const response = await fetch(`${API_URL}/files`)

    return response.json()
}