import { ref, onValue, push, set, remove } from 'firebase/database'
import { db } from '../firebase'

const BASE = 'delegatedMembers'

// Écoute les membres délégués d'une tribu
export function listenDelegatedMembersOfTribu(tribuKey, callback) {
  return onValue(ref(db, BASE), (snap) => {
    const data = snap.val() || {}
    const list = Object.entries(data)
      .map(([id, m]) => ({ uid: id, ...m }))
      .filter((m) => m.tribu === tribuKey)
      .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))
    callback(list)
  })
}

// Écoute TOUS les délégués (admin)
export function listenAllDelegatedMembers(callback) {
  return onValue(ref(db, BASE), (snap) => {
    const data = snap.val() || {}
    callback(Object.entries(data).map(([id, m]) => ({ uid: id, ...m })))
  })
}

// Crée un membre délégué dans la tribu du patriarche
export async function createDelegatedMember({
  nom,
  prenom,
  sexe,
  avatarId,
  tribu,
  contact = '',
  lieuHabitation = '',
  createdBy
}) {
  const newRef = push(ref(db, BASE))
  await set(newRef, {
    nom,
    prenom,
    sexe,
    avatarId,
    tribu,
    contact,
    lieuHabitation,
    estDelegue: true,
    createdBy,
    createdAt: Date.now()
  })
  return newRef.key
}

// Supprime un membre délégué
export async function deleteDelegatedMember(uid) {
  await remove(ref(db, `${BASE}/${uid}`))
}

// Met à jour la fiche d'un membre délégué
export async function updateDelegatedMember(uid, updates) {
  await set(ref(db, `${BASE}/${uid}`), updates)
}

// Retourne le label complet
export function delegatedMemberFullName(m) {
  return `${m.prenom || ''} ${m.nom || ''}`.trim()
}