import { ref, onValue, push, set, update, remove } from 'firebase/database'
import { db } from '../firebase'

// Écoute les cultes triés par date décroissante
export function listenCultes(callback) {
  return onValue(ref(db, 'cultes'), (snap) => {
    const data = snap.val() || {}
    const list = Object.entries(data)
      .map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => {
        const dA = `${a.date || ''}${a.heure || ''}`
        const dB = `${b.date || ''}${b.heure || ''}`
        return dB.localeCompare(dA)
      })
    callback(list)
  })
}

// Écoute un culte précis
export function listenCulte(culteId, callback) {
  return onValue(ref(db, `cultes/${culteId}`), (snap) => {
    callback(snap.val())
  })
}

// Crée un culte (admin uniquement)
export async function createCulte({ theme, date, heure, type, createdBy }) {
  const newRef = push(ref(db, 'cultes'))
  await set(newRef, {
    theme,
    date,
    heure: heure || '',
    type: type || 'dimanche',
    closed: false,
    createdBy,
    createdAt: Date.now()
  })
  return newRef.key
}

// Ferme un culte (admin ou patriarche de la tribu concernée)
export async function closeCulte(culteId) {
  await update(ref(db, `cultes/${culteId}`), { closed: true })
}

// Réouvre un culte
export async function reopenCulte(culteId) {
  await update(ref(db, `cultes/${culteId}`), { closed: false })
}

// Supprime un culte (admin)
export async function deleteCulte(culteId) {
  await remove(ref(db, `cultes/${culteId}`))
}

// Filtre les cultes d'une date donnée
export function cultesOfDate(cultes, date) {
  return cultes.filter((c) => c.date === date)
}

// Retourne la clé de date YYYY-MM-DD
export function culteDateKey(culte) {
  return culte.date
}