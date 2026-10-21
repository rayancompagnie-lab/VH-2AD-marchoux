import { useEffect, useState } from 'react'
import { ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { cleanupExpiredPosts, isExpired } from '../utils/ttl'
import { getCachedMessages } from '../utils/messagesCache'
import { listenMessages } from '../utils/messagesSync'
import Avatar from './Avatar'

const REACTION_EMOJIS = ['🙏', '❤️', '🔥', '👏', '🎉']

export default function PostFeed({ basePath, canDelete }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getCachedMessages(basePath).then((cached) => {
      if (Object.keys(cached).length > 0) {
        setPosts(Object.entries(cached).filter(([, p]) => !isExpired(p)).map(([id, p]) => ({ id, ...p })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
      }
    })

    const unsubscribe = listenMessages(basePath, async (data) => {
      await cleanupExpiredPosts(basePath, data)
      const list = Object.entries(data).filter(([, p]) => !isExpired(p)).map(([id, p]) => ({ id, ...p })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setPosts(list)
    })
    return unsubscribe
  }, [basePath])

  async function react(postId, emoji) {
    const reactionRef = ref(db, `${basePath}/${postId}/reactions/${emoji}/${user.uid}`)
    const isReacted = posts.find(p => p.id === postId)?.reactions?.[emoji]?.[user.uid]
    if (isReacted) await remove(reactionRef)
    else await set(reactionRef, true)
  }

  return (
    <div className="post-feed">
      {posts.map((post) => (
        <div key={post.id} className="post-card">
          <div className="post-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar avatarId={post.authorAvatarId} size={32} name={post.authorName} />
              <strong>{post.authorName}</strong>
            </div>
            <span className="expiry">{new Date(post.createdAt).toLocaleString('fr-FR')}</span>
          </div>

          {post.content && <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>}
          
          {/* Affichage des images */}
          {post.images && post.images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {post.images.map((img, i) => (
                <img key={i} src={img} alt="Publication" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 10, objectFit: 'cover' }} />
              ))}
            </div>
          )}

          <div className="reactions">
            {REACTION_EMOJIS.map((emoji) => {
              const count = post.reactions?.[emoji] ? Object.keys(post.reactions[emoji]).length : 0
              const reacted = post.reactions?.[emoji]?.[user.uid]
              return (
                <button key={emoji} className={reacted ? 'reaction active' : 'reaction'} onClick={() => react(post.id, emoji)}>
                  {emoji} {count > 0 && count}
                </button>
              )
            })}
          </div>

          {canDelete && (
            <button className="delete-btn" onClick={() => { if(window.confirm('Supprimer ?')) remove(ref(db, `${basePath}/${post.id}`)) }}>
              🗑️ Supprimer
            </button>
          )}
        </div>
      ))}
    </div>
  )
}