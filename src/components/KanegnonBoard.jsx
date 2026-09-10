import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { cleanupExpiredPosts, computeExpiresAt, isExpired } from '../utils/ttl'

const BASE_PATH = 'groupes/kanegnon'

export default function KanegnonBoard() {
  const { user, profile, isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const unsub = onValue(ref(db, BASE_PATH), async (snap) => {
      const data = snap.val() || {}
      await cleanupExpiredPosts(BASE_PATH, data)
      const list = Object.entries(data)
        .filter(([, p]) => !isExpired(p))
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setPosts(list)
    }, (err) => setError('Erreur : ' + err.message))
    return unsub
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text) return
    setSending(true)
    try {
      const newRef = push(ref(db, BASE_PATH))
      await set(newRef, {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        authorPhoto: profile?.photoPrincipale || '',
        content: text,
        createdAt: Date.now(),
        expiresAt: computeExpiresAt({ durationHours: 168 })
      })
      setText('')
    } catch (err) {
      setError("Échec de l'envoi : " + err.message)
    } finally {
      setSending(false)
    }
  }

  async function deletePost(id) {
    if (!window.confirm('Supprimer ce message ?')) return
    await remove(ref(db, `${BASE_PATH}/${id}`))
  }

  return (
    <div className="kanegnon-board">
      <h2 style={{ color: 'var(--color-teal-dark)' }}>🛡️ Kanegnon</h2>
      <p className="muted-small" style={{ marginBottom: 16 }}>
        L'espace des hommes de Vase d'honneur
      </p>

      <form onSubmit={handleSubmit} className="post-composer">
        {error && <p className="error">{error}</p>}
        <textarea
          placeholder="Écris un message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={sending}>{sending ? 'Envoi...' : 'Publier'}</button>
      </form>

      <div className="post-feed">
        {posts.length === 0 && <p>Aucun message pour le moment.</p>}
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <strong>{post.authorName}</strong>
            </div>
            <p>{post.content}</p>
            {(post.authorUid === user?.uid || isAdmin) && (
              <button className="delete-btn" onClick={() => deletePost(post.id)}>Supprimer</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}