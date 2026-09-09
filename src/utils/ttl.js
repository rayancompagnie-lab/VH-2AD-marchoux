import { ref, remove } from 'firebase/database'
import { db } from '../firebase'

export const DEFAULT_DURATION_MS = 24 * 60 * 60 * 1000 // 24h par défaut

// Calcule expiresAt à partir d'une durée en heures (ou une date précise en ms)
export function computeExpiresAt({ durationHours, exactDate }) {
  if (exactDate) return new Date(exactDate).getTime()
  const hours = durationHours && durationHours > 0 ? durationHours : 24
  return Date.now() + hours * 60 * 60 * 1000
}

export function isExpired(post) {
  return typeof post.expiresAt === 'number' && post.expiresAt <= Date.now()
}

// Supprime de la base de données (et donc de l'application) les posts expirés.
// Appelé côté client (au chargement des listes) faute de Cloud Functions planifiées.
export async function cleanupExpiredPosts(basePath, postsObject) {
  if (!postsObject) return
  const deletions = Object.entries(postsObject)
    .filter(([, post]) => isExpired(post))
    .map(([id]) => remove(ref(db, `${basePath}/${id}`)))
  if (deletions.length) await Promise.all(deletions)
}
