const API_URL = import.meta.env.VITE_ADMIN_API_URL ?? "http://127.0.0.1:8000/api/v1"

function getHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
    const token = localStorage.getItem("token")
    const headers: Record<string, string> = {
        ...extraHeaders as Record<string, string>,
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    return headers
}

async function readJsonResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const fallback = `Requête échouée (${response.status})`
        let message = fallback

        try {
            const payload = await response.json() as { detail?: string; message?: string }
            message = payload.detail ?? payload.message ?? fallback
        } catch {
            message = fallback
        }

        throw new Error(message)
    }

    return response.json() as Promise<T>
}

export type AccessRight = {
    code: string
    label: string
    description: string
    exclusive?: boolean
}

export type RightsCatalog = {
    grades: AccessRight[]
    permissions: AccessRight[]
}

export type UserRights = {
    grade: string
    permission: string
}

export type AdminUser = {
    id: number
    username: string
    email: string
    full_name: string | null
    created_at: string | null
    updated_at: string | null
    rights: UserRights[]
}

export type CurrentUserRights = {
    user_id: number
    username: string
    email: string
    full_name: string | null
    grades: string[]
    permissions: string[]
    can_manage_users: boolean
}

export type UserCreatePayload = {
    username: string
    email: string
    full_name: string
    password?: string
    grade: string
    permission: string
}

export async function fetchRightsCatalog(): Promise<RightsCatalog> {
    const response = await fetch(`${API_URL}/administration/rights`, {
        headers: getHeaders(),
    })

    return readJsonResponse<RightsCatalog>(response)
}

export async function fetchCurrentUserRights(): Promise<CurrentUserRights> {
    const response = await fetch(`${API_URL}/administration/rights/me`, {
        headers: getHeaders(),
    })

    return readJsonResponse<CurrentUserRights>(response)
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
    const response = await fetch(`${API_URL}/administration/users`, {
        headers: getHeaders(),
    })

    const data = await readJsonResponse<{ users?: AdminUser[] }>(response)
    return data.users ?? []
}

export async function createAdminUser(payload: UserCreatePayload): Promise<{ status: string; username?: string }> {
    const response = await fetch(`${API_URL}/administration/users`, {
        method: "POST",
        headers: getHeaders({
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
    })

    return readJsonResponse<{ status: string; username?: string }>(response)
}

export async function updateAdminUser(userId: number, payload: UserCreatePayload): Promise<{ status: string; user_id?: number }> {
    const response = await fetch(`${API_URL}/administration/users/${userId}`, {
        method: "PUT",
        headers: getHeaders({
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
    })

    return readJsonResponse<{ status: string; user_id?: number }>(response)
}

export async function bootstrapFirstUser(payload: Omit<UserCreatePayload, "permission">): Promise<{ status: string; username?: string }> {
    const response = await fetch(`${API_URL}/administration/users/bootstrap`, {
        method: "POST",
        headers: getHeaders({
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({
            ...payload,
            permission: "1",
        }),
    })

    return readJsonResponse<{ status: string; username?: string }>(response)
}

export async function updateUserRights(userId: number, payload: UserRights): Promise<{ status: string; user_id?: number }> {
    const response = await fetch(`${API_URL}/administration/users/${userId}/rights`, {
        method: "PUT",
        headers: getHeaders({
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
    })

    return readJsonResponse<{ status: string; user_id?: number }>(response)
}

export async function deleteAdminUser(userId: number): Promise<{ status: string; user_id?: number }> {
    const response = await fetch(`${API_URL}/administration/users/${userId}`, {
        method: "DELETE",
        headers: getHeaders(),
    })

    return readJsonResponse<{ status: string; user_id?: number }>(response)
}