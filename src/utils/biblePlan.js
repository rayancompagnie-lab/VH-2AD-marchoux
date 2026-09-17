import { ref, update, get } from 'firebase/database'
import { db } from '../firebase'

// Charge le plan sauvegardé d'un utilisateur
export async function loadPlan(uid) {
  const snap = await get(ref(db, `users/${uid}/biblePlan`))
  return snap.val()
}

// Sauvegarde un plan complet
export async function savePlan(uid, plan) {
  await update(ref(db, `users/${uid}/biblePlan`), plan)
}

// Marque un jour comme lu / non lu
export async function toggleDayRead(uid, currentCompleted, day) {
  const set = new Set(currentCompleted || [])
  if (set.has(day)) {
    set.delete(day)
  } else {
    set.add(day)
  }
  await update(ref(db, `users/${uid}/biblePlan`), {
    completedDays: Array.from(set).sort((a, b) => a - b)
  })
  return Array.from(set).sort((a, b) => a - b)
}

// Supprime le plan (reset)
export async function clearPlan(uid) {
  await update(ref(db, `users/${uid}/biblePlan`), null)
}