// Utilitaires pour le système de pointage de présence (refonte patriarche/admin)

// Retourne la date du jour au format YYYY-MM-DD
export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Formate une date YYYY-MM-DD en français
export function formatDateFr(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Vérifie si un culte est encore modifiable
export function isCulteOpen(culte) {
  if (!culte) return false
  return culte.closed !== true
}

// Compte les présents dans un objet attendance pour un culte et une tribu
export function countPresents(attendance, culteId, tribuKey) {
  const tribuData = attendance?.[culteId]?.[tribuKey] || {}
  return Object.values(tribuData).filter((m) => m.status === 'present').length
}

// Compte les absents
export function countAbsents(attendance, culteId, tribuKey) {
  const tribuData = attendance?.[culteId]?.[tribuKey] || {}
  return Object.values(tribuData).filter((m) => m.status === 'absent').length
}

// Retourne le statut d'un membre pour un culte
export function getMemberStatus(attendance, culteId, tribuKey, uid) {
  return attendance?.[culteId]?.[tribuKey]?.[uid]?.status || null
}

// Statistiques de présence pour un membre sur les N derniers cultes
export function memberStats(allAttendance, uid, cultes, nbCultes = 5) {
  const recent = cultes.filter((c) => c.closed === true).slice(0, nbCultes)
  let presents = 0
  let absents = 0
  let nonPointes = 0

  for (const culte of recent) {
    const tribuKey = culte.__tribuKey // doit être fourni par l'appelant
    if (!tribuKey) continue
    const status = allAttendance?.[culte.date]?.[culte.id]?.[tribuKey]?.[uid]?.status
    if (status === 'present') presents++
    else if (status === 'absent') absents++
    else nonPointes++
  }

  return {
    presents,
    absents,
    nonPointes,
    total: recent.length,
    label: `${presents} présence(s) sur ${recent.length} culte(s)`
  }
}