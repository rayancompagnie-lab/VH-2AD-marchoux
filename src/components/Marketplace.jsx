import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { fileToResizedBase64 } from '../utils/images'
import PremiumBadge from './PremiumBadge'

const FREE_LIMIT = 5
const PREMIUM_WHATSAPP = '2250160672966' // +225 01 60 67 29 66

function toWhatsappLink(contact, message) {
  const digits = (contact || '').replace(/[^\d]/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

export default function Marketplace() {
  const { user, profile, isPremium, isAdmin } = useAuth()
  const [articles, setArticles] = useState([])
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'marche'), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data)
        .map(([id, a]) => ({ id, ...a }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setArticles(list)
    })
    return unsubscribe
  }, [])

  const myArticles = articles.filter((a) => a.authorUid === user.uid)
  const reachedLimit = !isPremium && myArticles.length >= FREE_LIMIT

  async function handleImagesChange(e) {
    const files = Array.from(e.target.files).slice(0, 3)
    const base64s = await Promise.all(files.map((f) => fileToResizedBase64(f, 800, 0.75)))
    setImages(base64s)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!titre || !description) {
      setError('Titre et description obligatoires.')
      return
    }
    if (reachedLimit) return
    setSending(true)
    try {
      const newRef = push(ref(db, 'marche'))
      await set(newRef, {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        authorContact: profile?.contact || '',
        authorPremium: isPremium,
        titre,
        description,
        images,
        createdAt: Date.now()
      })
      setTitre('')
      setDescription('')
      setImages([])
    } finally {
      setSending(false)
    }
  }

  async function deleteArticle(id) {
    await remove(ref(db, `marche/${id}`))
  }

  return (
    <div className="marketplace">
      <h2>Marché</h2>

      {!reachedLimit ? (
        <form onSubmit={handleSubmit} className="post-composer">
          {error && <p className="error">{error}</p>}
          <input placeholder="Titre de l'article" value={titre} onChange={(e) => setTitre(e.target.value)} />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="file" accept="image/*" multiple onChange={handleImagesChange} />
          <p className="muted-small">
            {myArticles.length}/{isPremium ? '∞' : FREE_LIMIT} articles publiés {isPremium && <PremiumBadge show />}
          </p>
          <button type="submit" disabled={sending}>{sending ? 'Publication...' : "Publier l'article"}</button>
        </form>
      ) : (
        <div className="premium-cta">
          <p>Tu as atteint tes {FREE_LIMIT} articles gratuits sur le Marché.</p>
          <p>Passe au mode <strong>Premium</strong> (1000 FCFA/mois) pour publier sans limite, avec un badge ⭐ à côté de ton nom.</p>
          <a
            className="contact-btn"
            href={toWhatsappLink(
              PREMIUM_WHATSAPP,
              `Bonjour, je souhaite passer au mode Premium sur Vase d'honneur (compte : ${profile?.prenom} ${profile?.nom}).`
            )}
            target="_blank"
            rel="noreferrer"
          >
            Passer en Premium sur WhatsApp
          </a>
        </div>
      )}

      <div className="market-grid">
        {articles.map((a) => (
          <div key={a.id} className="market-card">
            {a.images?.[0] && <img src={a.images[0]} alt={a.titre} className="market-image" />}
            <h3>{a.titre}</h3>
            <p className="market-author">{a.authorName} <PremiumBadge show={a.authorPremium} /></p>
            <p>{a.description}</p>
            {a.authorContact && (
              <a className="contact-btn" href={toWhatsappLink(a.authorContact)} target="_blank" rel="noreferrer">
                Contacter le vendeur
              </a>
            )}
            {(a.authorUid === user.uid || isAdmin) && (
              <button className="delete-btn" onClick={() => deleteArticle(a.id)}>Supprimer</button>
            )}
          </div>
        ))}
        {articles.length === 0 && <p>Aucun article publié pour le moment.</p>}
      </div>
    </div>
  )
}
