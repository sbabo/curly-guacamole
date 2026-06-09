import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/app/App'

// Tests unitaires du composant App, point d'entrée de l'application.
const {
  fetchDocumentsMock,
  uploadDocumentMock,
  startIngestionFromUploadMock,
  answerIngestionQuestionMock,
  confirmIngestionMock,
  sendSearchMessageMock,
  subscribeIngestionEventsMock,
  updateIngestionDraftMock,
} = vi.hoisted(() => ({
  fetchDocumentsMock: vi.fn(),
  uploadDocumentMock: vi.fn(),
  startIngestionFromUploadMock: vi.fn(),
  answerIngestionQuestionMock: vi.fn(),
  confirmIngestionMock: vi.fn(),
  sendSearchMessageMock: vi.fn(),
  subscribeIngestionEventsMock: vi.fn(),
  updateIngestionDraftMock: vi.fn(),
}))

// Mock du module API pour contrôler les réponses lors des tests.
vi.mock('../../src/services/api', () => ({
  fetchDocuments: fetchDocumentsMock,
  uploadDocument: uploadDocumentMock,
  startIngestionFromUpload: startIngestionFromUploadMock,
  answerIngestionQuestion: answerIngestionQuestionMock,
  confirmIngestion: confirmIngestionMock,
  sendSearchMessage: sendSearchMessageMock,
  subscribeIngestionEvents: subscribeIngestionEventsMock,
  updateIngestionDraft: updateIngestionDraftMock,
}))

// Suite de tests pour le composant App.
describe('App (POC)', () => {
  beforeEach(() => {
    // Réinitialise les mocks avant chaque test pour éviter les interférences.
    vi.clearAllMocks()

    fetchDocumentsMock.mockResolvedValue([])
    uploadDocumentMock.mockResolvedValue({
      name: 'contrat_test.txt',
      relative_path: 'documents/tmp/contrat_test.txt',
      status: 'provisoire',
    })

    subscribeIngestionEventsMock.mockReturnValue(() => {})
    startIngestionFromUploadMock.mockResolvedValue({})
    answerIngestionQuestionMock.mockResolvedValue({})
    confirmIngestionMock.mockResolvedValue({
      final_relative_path: 'documents/contrat_test.txt',
      ingest: {
        document_id: 1,
        detected_type: 'contrat_rh',
        status: 'indexed',
        embedding_ids: [1, 2],
        mandatory_fields: [],
        optional_fields: [],
      },
    })
    sendSearchMessageMock.mockResolvedValue({ reply: 'ok' })
    updateIngestionDraftMock.mockResolvedValue({ job: null })
    window.localStorage.clear()
  })

  async function loginAs(user: ReturnType<typeof userEvent.setup>, login: string) {
    await user.type(screen.getByLabelText('Identifiant'), login)
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
  }

  it('affiche l ecran de connexion avant le chat', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Authentification requise' })).toBeInTheDocument()
    expect(fetchDocumentsMock).not.toHaveBeenCalled()
  })

  // Vérifie que les documents sont chargés au montage du composant.
  it('charge les documents au montage', async () => {
    const user = userEvent.setup()

    render(<App />)

    await loginAs(user, 'alice')

    await waitFor(() => {
      expect(fetchDocumentsMock).toHaveBeenCalledTimes(1)
    })
  })

  // Vérifie que le composant affiche un message après un upload réussi.
  it('affiche un message après un upload réussi', async () => {
    const user = userEvent.setup()

    render(<App />)

    await loginAs(user, 'alice')

    const input = document.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) {
      throw new TypeError('Input file introuvable')
    }

    const file = new File(['contenu'], 'contrat_test.txt', { type: 'text/plain' })
    await user.upload(input, file)

    await waitFor(() => {
      expect(uploadDocumentMock).toHaveBeenCalledTimes(1)
    })

    const uploadedMessage = await screen.findByText('Document ajouté en provisoire: contrat_test.txt')
    expect(uploadedMessage.textContent).toBe('Document ajouté en provisoire: contrat_test.txt')

    expect(fetchDocumentsMock).toHaveBeenCalledTimes(2)
  })
})
