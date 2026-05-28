import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import FileTree from '../../../../src/components/sidebar/FileTree'

describe('FileTree', () => {
  // Vérifie que le bouton de démarrage est désactivé lorsqu'aucun document provisoire n'est sélectionné.
  it('désactive le bouton de démarrage sans sélection', () => {
    render(
      <FileTree
        documents={[]}
        selectedTmpPath={null}
        onUpload={vi.fn()}
        onSelectTmp={vi.fn()}
        onStartIngestion={vi.fn()}
        isIngestionBusy={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Démarrer ingestion' })).toHaveProperty('disabled', true)
  })

  // Vérifie que le bouton de démarrage est désactivé lorsque l'ingestion est en cours.
  it('autorise la sélection uniquement des documents provisoires', async () => {
    const user = userEvent.setup()
    const onSelectTmp = vi.fn()

    render(
      <FileTree
        documents={[
          { name: 'doc_tmp.txt', relative_path: 'documents/tmp/doc_tmp.txt', status: 'provisoire' },
          { name: 'doc_final.txt', relative_path: 'documents/doc_final.txt', status: 'definitif' },
        ]}
        selectedTmpPath={null}
        onUpload={vi.fn()}
        onSelectTmp={onSelectTmp}
        onStartIngestion={vi.fn()}
        isIngestionBusy={false}
      />,
    )

    const tmpButton = screen.getByRole('button', { name: /doc_tmp.txt/i })
    const finalButton = screen.getByRole('button', { name: /doc_final.txt/i })

    expect(finalButton).toHaveProperty('disabled', true)

    await user.click(finalButton)
    await user.click(tmpButton)

    expect(onSelectTmp).toHaveBeenCalledTimes(1)
    expect(onSelectTmp).toHaveBeenCalledWith('documents/tmp/doc_tmp.txt')
  })
})
