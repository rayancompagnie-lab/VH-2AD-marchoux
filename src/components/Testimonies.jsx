import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Testimonies() {
  const { user, profile, canManage } = useAuth()
  const canModerate = canManage('temoignages')
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [pdf, setPdf] = useState(null)
  const [anonymous, setAnonymous] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'temoignages'), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data)
        .map(([id, t]) => ({ id, ...t }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setItems(list)
    })
    return unsubscribe
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!text && !pdf) {
      setError('Écris un témoignage ou joins un PDF.')
      return
    }
    setSending(true)
    try {
      const newRef = push(ref(db, 'temoignages'))
      const payload = {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        anonymous,
        approved: false,
        createdAt: Date.now()
      }
      if (pdf) {
        payload.type = 'pdf'
        payload.content = await fileToBase64(pdf)
        payload.fileName = pdf.name
      } else {
        payload.type = 'texte'
        payload.content = text
      }
      await set(newRef, payload)
      setText('')
      setPdf(null)
      setAnonymous(false)
    } catch (err) {
      setError("Échec de l'envoi : " + err.message)
    } finally {
      setSending(false)
    }
  }

  async function approve(id) {
    await set(ref(db, `temoignages/${id}/approved`), true)
  }

  async function deleteItem(id) {
    if (!window.confirm('Supprimer définitivement ce témoignage ?')) return
    await remove(ref(db, `temoignages/${id}`))
  }

  const visibleItems = items.filter((t) => t.approved || (canModerate && !t.approved) || t.authorUid === user?.uid)

  return (
    <div className="testimonies">
      <h2>Témoignages</h2>
      <p className="muted-small">
        Chaque témoignage doit être validé par un admin avant d'être visible par tous. Si tu choisis l'anonymat,
        personne — même les admins — ne verra ton nom affiché.
      </p>

      <form onSubmit={handleSubmit} className="post-composer">
        {error && <p className="error">{error}</p>}
        <textarea placeholder="Écris ton témoignage..." value={text} onChange={(e) => setText(e.target.value)} />
        <label className="photo-field">
          Ou joins un PDF (à la place du texte)
          <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files[0] || null)} />
        </label>
        <label className="field-with-toggle">
          <span><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Rester anonyme (même les admins ne verront pas mon nom)</span>
        </label>
        <button type="submit" disabled={sending}>{sending ? 'Envoi...' : 'Envoyer pour validation'}</button>
      </form>

      <div className="post-feed">
        {visibleItems.length === 0 && <p>Aucun témoignage pour le moment.</p>}
        {visibleItems.map((t) => {
          const displayName = t.anonymous ? 'Anonyme' : t.authorName
          const isMine = t.authorUid === user?.uid
          return (
            <div key={t.id} className="post-card">
              <div className="post-header">
                <strong>{displayName}</strong>
                {!t.approved && <span className="expiry">{canModerate ? 'En attente de validation' : isMine ? 'En attente de validation par un admin' : ''}</span>}
              </div>

              {t.type === 'texte' && <p>{t.content}</p>}
              {t.type === 'pdf' && (
                <a className="contact-btn" href={t.content} download={t.fileName || 'temoignage.pdf'} target="_blank" rel="noreferrer">
                  📄 Voir le PDF
                </a>
              )}

              <div className="testimony-actions">
                {canModerate && !t.approved && (
                  <button className="contact-btn" onClick={() => approve(t.id)}>✅ Publier</button>
                )}
                {(canModerate || isMine) && (
                  <button className="delete-btn" onClick={() => deleteItem(t.id)}>Supprimer</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
