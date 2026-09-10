import { useEffect, useState } from 'react'
import { onValue, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { cleanupExpiredPosts, isExpired } from '../utils/ttl'
import Avatar from './Avatar'

const REACTION_EMOJIS = ['🙏', '❤️', '🔥', '👏', '🎉']

export default function PostFeed({ basePath, canDelete }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])

  useEffect(() => {
    const postsRef = ref(db, basePath)
    const unsubscribe = onValue(postsRef, async (snap) => {
      const data = snap.val() || {}
      await cleanupExpiredPosts(basePath, data)
      const list = Object.entries(data)
        .filter(([, p]) => !isExpired(p))
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setPosts(list)
    })
    return unsubscribe
  }, [basePath])

  async function react(postId, emoji) {
    await set(ref(db, `${basePath}/${postId}/reactions/${emoji}/${user.uid}`), true)
  }

  async function removeReaction(postId, emoji) {
    await remove(ref(db, `${basePath}/${postId}/reactions/${emoji}/${user.uid}`))
  }

  async function deletePost(postId) {
    if (!window.confirm('Supprimer définitivement cette publication ?')) return
    await remove(ref(db, `${basePath}/${postId}`))
  }

  return (
    <div className="post-feed">
      {posts.length === 0 && <p>Aucune publication pour le moment.</p>}
      {posts.map((post) => (
        <div key={post.id} className="post-card">
          <div className="post-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar avatarId={post.authorAvatarId} size={32} name={post.authorName} />
              <strong>{post.authorName}</strong>
            </div>
            {post.expiresAt && (
              <span className="expiry">
                expire le {new Date(post.expiresAt).toLocaleString('fr-FR')}
              </span>
            )}
          </div>

          {post.content && <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>}

          <div className="reactions">
            {REACTION_EMOJIS.map((emoji) => {
              const count = post.reactions?.[emoji] ? Object.keys(post.reactions[emoji]).length : 0
              const reacted = post.reactions?.[emoji]?.[user.uid]
              return (
                <button
                  key={emoji}
                  className={reacted ? 'reaction active' : 'reaction'}
                  onClick={() => (reacted ? removeReaction(post.id, emoji) : react(post.id, emoji))}
                >
                  {emoji} {count > 0 && count}
                </button>
              )
            })}
          </div>

          {canDelete && (
            <button className="delete-btn" onClick={() => deletePost(post.id)}>
              🗑️ Supprimer
            </button>
          )}
        </div>
      ))}
    </div>
  )
}