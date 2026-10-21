import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../firebase'
import { TRIBUS } from './groups'

// Écoute le patriarche d'une tribu
export function listenPatriarche(tribuKey, callback) {
  return onValue(ref(db, `tribus/${tribuKey}/patriarcheUid`), (snap) => {
    callback(snap.val() || null)
  })
}

// Écoute tous les patriarches (map tribuKey -> uid)
export function listenAllPatriarches(callback) {
  return onValue(ref(db, 'tribus'), (snap) => {
    const data = snap.val() || {}
    const map = {}
    for (const key of Object.keys(data)) {
      map[key] = data[key]?.patriarcheUid || null
    }
    callback(map)
  })
}

// Vérifie si un user est patriarche d'une tribu donnée
export function isPatriarcheOf(profile, tribuKey, patriarchesMap) {
  if (!profile?.uid || !tribuKey) return false
  return patriarchesMap?.[tribuKey] === profile.uid
}

// Retourne la tribu dont le user est patriarche (ou null)
export function getTribuOfPatriarche(uid, patriarchesMap) {
  if (!uid || !patriarchesMap) return null
  for (const [tribuKey, patriarcheUid] of Object.entries(patriarchesMap)) {
    if (patriarcheUid === uid) return tribuKey
  }
  return null
}

// Désigne un patriarche (admin uniquement)
export async function setPatriarche(tribuKey, uid) {
  await set(ref(db, `tribus/${tribuKey}/patriarcheUid`), uid)
}

// Retire le patriarche d'une tribu (admin uniquement)
export async function removePatriarche(tribuKey) {
  await remove(ref(db, `tribus/${tribuKey}/patriarcheUid`))
}

// Retourne le label d'une tribu
export function getTribuLabel(tribuKey) {
  const t = TRIBUS.find((x) => x.key === tribuKey)
  return t ? t.label : tribuKey
}