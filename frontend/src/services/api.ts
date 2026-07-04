const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1/guacamol"

function getHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {
        ...extraHeaders as Record<string, string>
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return headers
}

async function readJsonResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const fallback = `Requête échouée (${response.status})`
        let message = fallback

        try {
            const payload = await response.json()
            message = payload.detail ?? payload.message ?? fallback
        } catch {
            message = fallback
        }

        throw new Error(message)
    }

    return response.json() as Promise<T>
}

export type DocumentItem = {
    name: string
    relative_path: string
    status: "provisoire" | "definitif"
}

export type ExtractionField = {
    field_name: string
    field_value: string
}

export type IngestJobStatus =
    | "queued"
    | "processing"
    | "waiting_user_input"
    | "ready_for_validation"
    | "persisting"
    | "indexed"
    | "error"

export type IngestJobSnapshot = {
    job_id: string
    relative_tmp_path: string
    status: IngestJobStatus
    message: string
    session_id: string | null
    detected_type: string | null
    detected_type_options: string[]
    mandatory_keys_expected: string[]
    optional_keys_expected: string[]
    mandatory_fields: ExtractionField[]
    optional_fields: ExtractionField[]
    missing_mandatory_keys: string[]
    next_question: string | null
    final_relative_path: string | null
    document_id: number | null
    embedding_ids: number[]
    error: string | null
}

export type IngestJobResponse = {
    job: IngestJobSnapshot
}

export type IngestConfirmPayload = {
    title: string
    describe: string
    meta: Record<string, string>
    acl_groups: string
    acl_level: string
    is_and_logic: boolean
    user_id: number
}

export type IngestConfirmResult = {
    final_relative_path: string
    ingest: {
        document_id: number
        detected_type: string
        status: string
        embedding_ids: number[]
        mandatory_fields: ExtractionField[]
        optional_fields: ExtractionField[]
    }
}

export type IngestAnswerResult = {
    session_id: string
    detected_type: string
    status: string
    mandatory_fields: ExtractionField[]
    optional_fields: ExtractionField[]
    missing_mandatory_keys: string[]
    next_question: string | null
}

export type IngestDraftUpdatePayload = {
    detected_type: string | null
    mandatory_fields: ExtractionField[]
    optional_fields: ExtractionField[]
}

export async function sendSearchMessage(message: string): Promise<{ reply?: string }> {

    const response = await fetch(`${API_URL}/chat/search`, {
        method: "POST",
        headers: getHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            message
        })
    })

    return readJsonResponse(response)
}

export async function fetchDocuments(): Promise<DocumentItem[]> {

    const response = await fetch(`${API_URL}/documents`, {
        headers: getHeaders()
    })
    const data = await readJsonResponse<{ documents?: DocumentItem[] }>(response)

    return data.documents ?? []
}

export async function uploadDocument(file: File): Promise<DocumentItem> {

    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: getHeaders(),
        body: formData
    })

    const data = await readJsonResponse<{ document: DocumentItem }>(response)
    return data.document
}

export async function startIngestionFromUpload(relativeTmpPath: string): Promise<IngestJobResponse> {

    const response = await fetch(`${API_URL}/ingest/from-upload/start`, {
        method: "POST",
        headers: getHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            relative_tmp_path: relativeTmpPath
        })
    })

    return readJsonResponse(response)
}

export async function answerIngestionQuestion(sessionId: string, answer: string): Promise<IngestAnswerResult> {
    const response = await fetch(`${API_URL}/ingest/${sessionId}/answer`, {
        method: "POST",
        headers: getHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            answer
        })
    })

    return readJsonResponse(response)
}

export async function confirmIngestion(
    sessionId: string,
    payload: IngestConfirmPayload,
): Promise<IngestConfirmResult> {
    const response = await fetch(`${API_URL}/ingest/${sessionId}/confirm`, {
        method: "POST",
        headers: getHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    })

    return readJsonResponse(response)
}

export async function updateIngestionDraft(
    sessionId: string,
    payload: IngestDraftUpdatePayload,
): Promise<IngestJobResponse> {
    const response = await fetch(`${API_URL}/ingest/${sessionId}/draft`, {
        method: "POST",
        headers: getHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    })

    return readJsonResponse(response)
}

export function subscribeIngestionEvents(
    sessionId: string,
    onUpdate: (job: IngestJobSnapshot) => void,
    onError?: (message: string) => void,
) {
    const token = localStorage.getItem('token')
    const url = new URL(`${API_URL}/ingest/${sessionId}/events`)
    if (token) {
        url.searchParams.set('token', token)
    }
    const source = new EventSource(url.toString())
    let lastStatus: IngestJobStatus | null = null

    source.addEventListener("progress", (event: MessageEvent) => {
        try {
            const payload = JSON.parse(event.data) as IngestJobSnapshot
            lastStatus = payload.status
            onUpdate(payload)
        } catch {
            onError?.("Payload SSE invalide.")
        }
    })

    source.onerror = () => {
        if (lastStatus === "indexed" || lastStatus === "error") {
            source.close()
            return
        }

        onError?.("Le flux SSE a été interrompu.")
        source.close()
    }

    return () => source.close()
}