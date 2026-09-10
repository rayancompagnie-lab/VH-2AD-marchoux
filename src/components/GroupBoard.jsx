import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { cleanupExpiredPosts, computeExpiresAt, isExpired } from '../utils/ttl'
import Avatar from './Avatar'

const EXTEND_HOURS = 24

// groupPath ex: "tribu-ruben", "statut-celibataire", "badge-<id>"
export default function GroupBoard({ groupPath, title }) {
  const { user, profile, isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const basePath = `groupes/${groupPath}`

  useEffect(() => {
    const postsRef = ref(db, basePath)
    const unsubscribe = onValue(
      postsRef,
      async (snap) => {
        const data = snap.val() || {}
        await cleanupExpiredPosts(basePath, data)
        const list = Object.entries(data)
          .filter(([, p]) => !isExpired(p))
          .map(([id, p]) => ({ id, ...p }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setPosts(list)
      },
      (err) => setError('Impossible de charger ce groupe : ' + err.message)
    )
    return unsubscribe
  }, [basePath])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!text) return
    setSending(true)
    try {
      const newRef = push(ref(db, basePath))
      await set(newRef, {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        authorAvatarId: profile?.avatarId || '',
        content: text,
        createdAt: Date.now(),
        expiresAt: computeExpiresAt({ durationHours: 24 })
      })
      setText('')
    } catch (err) {
      setError("Échec de l'envoi : " + err.message)
    } finally {
      setSending(false)
    }
  }

  async function extend(post) {
    const base = Math.max(post.expiresAt || 0, Date.now())
    await set(ref(db, `${basePath}/${post.id}/expiresAt`), base + EXTEND_HOURS * 60 * 60 * 1000)
  }

  async function deletePost(id) {
    if (!window.confirm('Supprimer définitivement ce message ?')) return
    await remove(ref(db, `${basePath}/${id}`))
  }

  return (
    <div className="group-board">
      <h2>{title}</h2>
      <p className="muted-small">Visible uniquement par les membres de ce groupe et les admins. Message conservé 24h par défaut, prolongeable.</p>

      <form onSubmit={handleSubmit} className="post-composer">
        {error && <p className="error">{error}</p>}
        <textarea placeholder="Écris un message..." value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" disabled={sending}>{sending ? 'Envoi...' : 'Envoyer'}</button>
      </form>

      <div className="post-feed">
        {posts.length === 0 && <p>Aucun message pour le moment.</p>}
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar avatarId={post.authorAvatarId} size={32} name={post.authorName} />
                <strong>{post.authorName}</strong>
              </div>
              {post.expiresAt && <span className="expiry">expire le {new Date(post.expiresAt).toLocaleString('fr-FR')}</span>}
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
            <div className="testimony-actions">
              {(post.authorUid === user?.uid || isAdmin) && (
                <button className="contact-btn" onClick={() => extend(post)}>⏳ Prolonger 24h</button>
              )}
              {isAdmin && (
                <button className="delete-btn" onClick={() => deletePost(post.id)}>Supprimer</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}