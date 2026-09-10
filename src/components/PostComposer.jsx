import { useState } from 'react'
import { push, ref, serverTimestamp, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { computeExpiresAt } from '../utils/ttl'

// basePath: "posts/culte" ou "posts/travail"
// defaultDurationHours: durée par défaut si l'auteur ne précise rien
export default function PostComposer({ basePath, defaultDurationHours = 24 }) {
  const { user, profile } = useAuth()
  const [text, setText] = useState('')
  const [durationHours, setDurationHours] = useState(defaultDurationHours)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!text) {
      setError('Ajoute un texte.')
      return
    }
    setSending(true)
    try {
      const newPostRef = push(ref(db, basePath))
      const expiresAt = computeExpiresAt({ durationHours })
      await set(newPostRef, {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        authorAvatarId: profile?.avatarId || '',
        type: 'texte',
        content: text,
        createdAt: serverTimestamp(),
        expiresAt,
        reactions: {}
      })
      setText('')
    } catch (err) {
      setError("Échec de l'envoi. Réessaie.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
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

      <button type="submit" disabled={sending}>{sending ? 'Envoi...' : 'Publier'}</button>
    </form>
  )
}