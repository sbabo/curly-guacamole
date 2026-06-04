import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ChatInput from '../../../../src/components/chat/ChatInput'

// Tests unitaires du composant ChatInput.
describe('ChatInput', () => {
  // Vérifie que le composant ne permet pas d'envoyer un message vide.
  it('n envoie pas de message vide', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(<ChatInput onSend={onSend} />)

    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(onSend).not.toHaveBeenCalled()
  })

  // Vérifie que le composant envoie le message puis vide le champ.
  it('envoie le message puis vide le champ', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(<ChatInput onSend={onSend} />)

    const input = screen.getByPlaceholderText('Message...')
    await user.type(input, 'Bonjour POC')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith('Bonjour POC')
    if (!(input instanceof HTMLInputElement)) {
      throw new TypeError('Champ de saisie introuvable')
    }
    expect(input.value).toBe('')
  })
})
