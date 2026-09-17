import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { computeExpiresAt } from '../utils/ttl'
import { sendMessage } from '../utils/messagesSync'

export default function PostComposer({ basePath, defaultDurationHours = 24 }) {
  const { user, profile } = useAuth()
  const [text, setText] = useState('')
  const [durationHours, setDurationHours] = useState(defaultDurationHours)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!text) {
      setError('Ajoute un texte.')
      return
    }

    setSending(true)
    try {
      const expiresAt = computeExpiresAt({ durationHours })

      await sendMessage(basePath, {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        authorAvatarId: profile?.avatarId || '',
        type: 'texte',
        content: text,
        createdAt: Date.now(),
        expiresAt,
        reactions: {}
      })

      if (!navigator.onLine) {
        setInfo('📵 Message enregistré hors ligne. Il sera envoyé dès que tu seras reconnecté.')
      } else {
        setInfo('✅ Message publié.')
      }

      setText('')
      setTimeout(() => setInfo(''), 4000)
    } catch (err) {
      setError("Échec de l'envoi. Réessaie.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      <textarea
        placeholder="Écris ton message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <label>
        Durée de vie du post (heures) :
        <input
          type="number"
          min="1"
          value={durationHours}
          onChange={(e) => setDurationHours(Number(e.target.value))}
        />
      </label>

      <button type="submit" disabled={sending}>
        {sending ? 'Envoi...' : 'Publier'}
      </button>
    </form>
  )
}