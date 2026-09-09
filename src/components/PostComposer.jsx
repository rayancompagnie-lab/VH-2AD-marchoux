import { useRef, useState } from 'react'
import { push, ref, serverTimestamp, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { computeExpiresAt } from '../utils/ttl'
import { fileToResizedBase64 } from '../utils/images'

const MAX_VOCAL_MS = 2 * 60 * 1000 // 2 minutes max

// Safari/iPhone ne supporte pas le format "audio/webm" utilisé par défaut sur
// Chrome/Android : on détecte le meilleur format supporté par le navigateur,
// et on l'utilise aussi bien pour l'enregistrement que pour le fichier final,
// sinon la note vocale semble s'enregistrer mais ne peut être lue nulle part.
function getSupportedMimeType() {
  const candidates = [
    'audio/mp4', // Safari / iPhone
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus'
  ]
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// basePath: "posts/culte" ou "posts/travail"
// allowedTypes: ['texte','vocal'] ou ['texte','image']
// defaultDurationHours: durée par défaut si l'auteur ne précise rien
export default function PostComposer({ basePath, allowedTypes, defaultDurationHours = 24 }) {
  const { user, profile } = useAuth()
  const [text, setText] = useState('')
  const [durationHours, setDurationHours] = useState(defaultDurationHours)
  const [image, setImage] = useState(null)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timeoutRef = useRef(null)
  const mimeTypeRef = useRef('')

  async function startRecording() {
    setError('')
    setAudioBlob(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      mimeTypeRef.current = mimeType
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      timeoutRef.current = setTimeout(() => stopRecording(), MAX_VOCAL_MS)
    } catch (err) {
      setError("Impossible d'accéder au micro (vérifie l'autorisation microphone dans les réglages de ton téléphone).")
    }
  }

  function stopRecording() {
    clearTimeout(timeoutRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!text && !audioBlob && !image) {
      setError('Ajoute un texte, un vocal ou une image.')
      return
    }
    setSending(true)
    try {
      const newPostRef = push(ref(db, basePath))
      const expiresAt = computeExpiresAt({ durationHours })
      const payload = {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        createdAt: serverTimestamp(),
        expiresAt,
        reactions: {}
      }
      if (audioBlob && allowedTypes.includes('vocal')) {
        payload.type = 'vocal'
        payload.content = await fileToBase64(audioBlob)
      } else if (image && allowedTypes.includes('image')) {
        payload.type = 'image'
        payload.content = await fileToResizedBase64(image)
        payload.texte = text
      } else {
        payload.type = 'texte'
        payload.content = text
      }
      await set(newPostRef, payload)
      setText('')
      setAudioBlob(null)
      setImage(null)
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

      {allowedTypes.includes('image') && (
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)} />
      )}

      {allowedTypes.includes('vocal') && (
        <div className="vocal-recorder">
          {!recording && <button type="button" onClick={startRecording}>🎙️ Enregistrer un vocal (2 min max)</button>}
          {recording && <button type="button" onClick={stopRecording}>⏹️ Arrêter l'enregistrement</button>}
          {audioBlob && <audio controls src={URL.createObjectURL(audioBlob)} />}
        </div>
      )}

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
