const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1/auth"

export async function login(username: string, password: string) {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
        let message = `Erreur de connexion (${response.status})`
        try {
            const payload = await response.json()
            message = payload.detail ?? message
        } catch {
            // ignore
        }
        throw new Error(message)
    }

    return response.json() // { access_token, refresh_token, token_type }
}
