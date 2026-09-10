import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { cleanupExpiredPosts, computeExpiresAt, isExpired } from '../utils/ttl'

const BASE_PATH = 'groupes/leaman'

export default function LeamanBoard() {
  const { user, profile, isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const unsub = onValue(
      ref(db, BASE_PATH),
      async (snap) => {
        const data = snap.val() || {}
        await cleanupExpiredPosts(BASE_PATH, data)
        const list = Object.entries(data)
          .filter(([, p]) => !isExpired(p))
          .map(([id, p]) => ({ id, ...p }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setPosts(list)
      },
      (err) => setError('Erreur : ' + err.message)
    )
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
        expiresAt: computeExpiresAt({ durationHours: 168 }) // 7 jours
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
    <div className="leaman-board" style={{
      background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%)',
      borderRadius: 16,
      padding: 20,
      minHeight: 400
    }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{
          color: '#b3123a',
          fontFamily: 'Georgia, serif',
          fontSize: 26,
          margin: 0,
          letterSpacing: 1
        }}>
          🌸 Leaman 🌸
        </h2>
        <p style={{ color: '#a05a6f', fontStyle: 'italic', fontSize: 13, margin: 5 }}>
          L'espace des femmes de Vase d'honneur
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 12px rgba(179, 18, 58, 0.08)',
        borderLeft: '4px solid #e8a0b5'
      }}>
        {error && <p className="error">{error}</p>}
        <textarea
          placeholder="Partage un mot d'encouragement, une prière, une pensée..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: '100%',
            minHeight: 80,
            padding: 12,
            border: '1px solid #f0d5dd',
            borderRadius: 10,
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontStyle: 'italic',
            resize: 'vertical'
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            marginTop: 12,
            background: 'linear-gradient(135deg, #d63a68, #b3123a)',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 20,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.5
          }}
        >
          {sending ? '...' : '💕 Publier'}
        </button>
      </form>

      <div style={{ marginTop: 24 }}>
        {posts.length === 0 && (
          <p style={{ textAlign: 'center', color: '#a05a6f', fontStyle: 'italic' }}>
            Aucun message pour le moment. Sois la première à partager 💐
          </p>
        )}
        {posts.map((post) => (
          <div key={post.id} style={{
            background: 'white',
            borderRadius: 14,
            padding: 16,
            marginBottom: 14,
            boxShadow: '0 2px 8px rgba(179, 18, 58, 0.06)',
            borderLeft: '3px solid #e8a0b5'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {post.authorPhoto ? (
                <img src={post.authorPhoto} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e8a0b5' }} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#e8a0b5', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {(post.authorName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <strong style={{ color: '#b3123a', fontFamily: 'Georgia, serif' }}>
                {post.authorName}
              </strong>
            </div>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 15, color: '#5a3040', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {post.content}
            </p>
            {(post.authorUid === user?.uid || isAdmin) && (
              <button
                onClick={() => deletePost(post.id)}
                style={{
                  marginTop: 10,
                  background: 'none',
                  border: '1px solid #e8a0b5',
                  color: '#b3123a',
                  padding: '4px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                🗑️ Supprimer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}