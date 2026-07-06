const API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://127.0.0.1:8000/api/v1/auth"

export async function fetchFirstUserStatus() {
    const response = await fetch(`${API_URL}/first-user`)
    const data = await response.json() as { user_exists?: boolean }

    if (!response.ok) {
        throw new Error(data?.user_exists === false ? "Premier utilisateur requis" : `Erreur (${response.status})`)
    }

    return Boolean(data.user_exists)
}

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
