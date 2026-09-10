// Utilitaires pour le système de pointage de présence

// Retourne la date du jour au format YYYY-MM-DD
export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Détecte le type de culte en fonction de la date
// Retourne null si aucun culte (lundi, mardi, jeudi, vendredi, samedi)
export function getCulteType(date = new Date()) {
  const day = date.getDay()
  if (day === 0) return 'dimanche'   // dimanche : 1er + 2e (+3e optionnel)
  if (day === 3) return 'mercredi'   // mercredi soir
  return null
}

// Liste les cultes disponibles selon la date et la config
// config = { culte3Special: true/false }
export function getCulteSlots(date = new Date(), config = {}) {
  const day = date.getDay()
  const slots = []
  if (day === 0) {
    slots.push({ key: 'culte1', label: '1er culte' })
    slots.push({ key: 'culte2', label: '2ème culte' })
    if (config.culte3Special) {
      slots.push({ key: 'culte3', label: '3ème culte spécial' })
    }
  } else if (day === 3) {
    slots.push({ key: 'mercredi', label: 'Culte du mercredi' })
  }
  return slots
}

// Vérifie si on peut pointer maintenant
// Dimanche : à partir de 6h00
// Mercredi : à partir de 17h00
export function isPointageOpen(date = new Date(), closedByAdmin = false) {
  if (closedByAdmin) return { open: false, reason: 'Fermé par un admin' }
  const day = date.getDay()
  const hours = date.getHours()
  if (day === 0) {
    if (hours < 6) return { open: false, reason: 'Ouverture à 6h00' }
    return { open: true }
  }
  if (day === 3) {
    if (hours < 17) return { open: false, reason: 'Ouverture à 17h00' }
    return { open: true }
  }
  return { open: false, reason: 'Pas de culte aujourd\'hui' }
}

// Détecte si un utilisateur est patriarche/matriarche de sa tribu
export function isPatriarche(profile, allBadges) {
  if (!profile?.badges) return false
  const badgeIds = Object.keys(profile.badges)
  return badgeIds.some(id => {
    const name = (allBadges[id]?.name || '').toLowerCase()
    return name.includes('patriarche') || name.includes('matriarche')
  })
}

// Formate une date en français
export function formatDateFr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}