import { ref, set, push, onValue } from 'firebase/database'
import { db } from '../firebase'
import {
  getCachedMessages,
  saveCachedMessages,
  addToQueue,
  getQueue,
  removeFromQueue
} from './messagesCache'

// ─── Écouter Firebase + mettre en cache ───
// Retourne une fonction unsubscribe
export function listenMessages(basePath, callback) {
  const messagesRef = ref(db, basePath)

  return onValue(
    messagesRef,
    (snap) => {
      const data = snap.val() || {}

      // 1. Sauvegarde dans le cache local
      saveCachedMessages(basePath, data)

      // 2. Appelle le callback avec les données fraîches
      callback(data)
    },
    (err) => {
      console.warn('Erreur Firebase, lecture depuis le cache:', err)
      // 3. Fallback : lecture depuis IndexedDB
      getCachedMessages(basePath).then(callback)
    }
  )
}

// ─── Envoyer un message (avec gestion hors ligne) ───
export async function sendMessage(basePath, payload) {
  const newRef = push(ref(db, basePath))
  const msgId = newRef.key
  const fullPayload = { ...payload, id: msgId }

  if (navigator.onLine) {
    // En ligne : envoi direct
    await set(newRef, payload)
  } else {
    // Hors ligne : mise en file d'attente
    console.log('📵 Hors ligne, message en attente')
    await addToQueue({
      id: msgId,
      basePath,
      payload,
      createdAt: Date.now()
    })
  }

  return msgId
}

// ─── Envoyer les messages en attente ───
// À appeler quand on revient en ligne
export async function flushQueue() {
  const queue = await getQueue()
  if (queue.length === 0) return 0

  console.log(`📤 Envoi de ${queue.length} message(s) en attente`)

  let sent = 0
  for (const item of queue) {
    try {
      const msgRef = ref(db, `${item.basePath}/${item.id}`)
      await set(msgRef, item.payload)
      await removeFromQueue(item.id)
      sent++
    } catch (e) {
      console.warn('Échec envoi message en attente:', e)
    }
  }

  console.log(`✅ ${sent}/${queue.length} message(s) envoyé(s)`)
  return sent
}

// ─── Détecter le retour en ligne ───
export function watchOnlineStatus() {
  window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie')
    flushQueue()
  })
}