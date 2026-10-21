import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { computeExpiresAt } from '../utils/ttl'
import { sendMessage } from '../utils/messagesSync'
import { fileToResizedBase64, isImageTooLarge } from '../utils/images'

export default function PostComposer({ basePath, defaultDurationHours = 24 }) {
  const { user, profile } = useAuth()
  const [text, setText] = useState('')
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleImagesChange(e) {
    const files = Array.from(e.target.files).slice(0, 1) // ✅ 1 seule image max
    try {
      const base64s = await Promise.all(files.map((f) => fileToResizedBase64(f, 600, 0.5))) // ✅ Compression max
      for (const b64 of base64s) {
        if (isImageTooLarge(b64, 100)) { // ✅ Max 100 Ko
          setError("Image trop lourde. Choisis une image plus simple.")
          return
        }
      }
      setImages(base64s)
    } catch (err) {
      setError("Erreur avec l'image.")
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!text && images.length === 0) return setError('Ajoute un texte ou une image.')

    setSending(true)
    try {
      await sendMessage(basePath, {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        authorAvatarId: profile?.avatarId || '',
        type: images.length > 0 ? 'image' : 'texte',
        content: text,
        images: images.length > 0 ? images : null,
        createdAt: Date.now(),
        expiresAt: computeExpiresAt({ durationHours: defaultDurationHours }),
        reactions: {}
      })
      setText('')
      setImages([])
    } catch (err) {
      setError("Échec de l'envoi (fichier trop lourd ?).")
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <textarea placeholder="Écris ton message..." value={text} onChange={(e) => setText(e.target.value)} />
      <label className="photo-field">
        📷 Ajouter une photo (optionnel)
        <input type="file" accept="image/*" onChange={handleImagesChange} />
      </label>
      {images.length > 0 && <img src={images[0]} alt="Aperçu" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
      <button type="submit" disabled={sending}>{sending ? 'Envoi...' : 'Publier'}</button>
    </form>
  )
}