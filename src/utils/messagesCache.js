import { get, set, del } from 'idb-keyval'

// ─── Clés IndexedDB ───
const CACHE_PREFIX = 'messages-'
const QUEUE_KEY = 'messages-queue'

function cacheKey(basePath) {
  // basePath = "posts/culte" -> "messages-posts-culte"
  return CACHE_PREFIX + basePath.replace(/\//g, '-')
}

// ─── Lecture du cache ───
// Retourne les messages non expirés du cache local
export async function getCachedMessages(basePath) {
  try {
    const cached = await get(cacheKey(basePath))
    if (!cached || typeof cached !== 'object') return {}

    const now = Date.now()
    const fresh = {}

    for (const [id, msg] of Object.entries(cached)) {
      // Garde uniquement les messages non expirés
      if (!msg.expiresAt || msg.expiresAt > now) {
        fresh[id] = msg
      }
    }

    // Si on a filtré des messages, met à jour le cache
    if (Object.keys(fresh).length !== Object.keys(cached).length) {
      await set(cacheKey(basePath), fresh)
    }

    return fresh
  } catch (e) {
    console.warn('Erreur lecture cache messages:', e)
    return {}
  }
}

// ─── Écriture du cache ───
// Sauvegarde un objet de messages (comme celui de Firebase)
export async function saveCachedMessages(basePath, messagesObj) {
  try {
    await set(cacheKey(basePath), messagesObj)
  } catch (e) {
    console.warn('Erreur écriture cache messages:', e)
  }
}

// ─── Fusion ───
// Ajoute ou met à jour un seul message dans le cache
export async function upsertCachedMessage(basePath, msgId, msg) {
  try {
    const existing = (await get(cacheKey(basePath))) || {}
    existing[msgId] = msg
    await set(cacheKey(basePath), existing)
  } catch (e) {
    console.warn('Erreur upsert cache:', e)
  }
}

// ─── Suppression ───
export async function removeCachedMessage(basePath, msgId) {
  try {
    const existing = (await get(cacheKey(basePath))) || {}
    delete existing[msgId]
    await set(cacheKey(basePath), existing)
  } catch (e) {
    console.warn('Erreur suppression cache:', e)
  }
}

// ─── File d'attente (écriture hors ligne) ───
export async function getQueue() {
  const q = await get(QUEUE_KEY)
  return Array.isArray(q) ? q : []
}

export async function addToQueue(item) {
  // item = { id, basePath, payload, createdAt }
  const q = await getQueue()
  q.push(item)
  await set(QUEUE_KEY, q)
}

export async function removeFromQueue(itemId) {
  const q = await getQueue()
  const filtered = q.filter((x) => x.id !== itemId)
  await set(QUEUE_KEY, filtered)
}

export async function clearQueue() {
  await del(QUEUE_KEY)
}