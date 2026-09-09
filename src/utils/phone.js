// Si l'utilisateur ne précise pas d'indicatif, on suppose la Côte d'Ivoire (+225).
export function normalizeIvorianPhone(input) {
  const raw = String(input || '').trim()
  if (!raw) return raw
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+225')) return cleaned
  if (cleaned.startsWith('225')) return `+${cleaned}`
  if (cleaned.startsWith('+')) return cleaned // autre pays explicitement renseigné
  if (cleaned.startsWith('0')) return `+225${cleaned.slice(1)}`
  return `+225${cleaned}`
}
