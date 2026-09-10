// Avatars prédéfinis : emoji + couleur de fond.
// Deux listes séparées (Kanegnon / Leaman) selon le sexe.

export const AVATARS_HOMMES = [
  { id: 'h-lion',      emoji: '🦁', color: '#7b1e3a', label: 'Lion' },
  { id: 'h-aigle',     emoji: '🦅', color: '#1a3e6e', label: 'Aigle' },
  { id: 'h-epee',      emoji: '⚔️', color: '#23302e', label: 'Épée' },
  { id: 'h-bouclier',  emoji: '🛡️', color: '#0d4f4f', label: 'Bouclier' },
  { id: 'h-couronne',  emoji: '👑', color: '#d4af37', label: 'Couronne' },
  { id: 'h-baobab',    emoji: '🌳', color: '#1f7a4d', label: 'Baobab' },
  { id: 'h-elephant',  emoji: '🐘', color: '#6b7a77', label: 'Éléphant' },
  { id: 'h-flamme',    emoji: '🔥', color: '#b3123a', label: 'Flamme' },
  { id: 'h-montagne',  emoji: '🏔️', color: '#4a6f8a', label: 'Montagne' },
  { id: 'h-etoile',    emoji: '🌟', color: '#c9a227', label: 'Étoile' },
  { id: 'h-eclair',    emoji: '⚡', color: '#5a4dbf', label: 'Éclair' },
  { id: 'h-guepard',   emoji: '🐆', color: '#d97a2b', label: 'Guépard' }
]

export const AVATARS_FEMMES = [
  { id: 'f-fleur',     emoji: '🌸', color: '#d63a68', label: 'Fleur' },
  { id: 'f-colombe',   emoji: '🕊️', color: '#0d6e6e', label: 'Colombe' },
  { id: 'f-diamant',   emoji: '💎', color: '#3aa6d6', label: 'Diamant' },
  { id: 'f-couronne',  emoji: '👑', color: '#d4af37', label: 'Couronne' },
  { id: 'f-hibiscus',  emoji: '🌺', color: '#b3123a', label: 'Hibiscus' },
  { id: 'f-papillon',  emoji: '🦋', color: '#7b46c1', label: 'Papillon' },
  { id: 'f-rose',      emoji: '🌹', color: '#8f0e2e', label: 'Rose' },
  { id: 'f-tournesol', emoji: '🌻', color: '#c9a227', label: 'Tournesol' },
  { id: 'f-bouquet',   emoji: '💐', color: '#e67e22', label: 'Bouquet' },
  { id: 'f-lune',      emoji: '🌙', color: '#4a4a7a', label: 'Lune' },
  { id: 'f-etoilefil', emoji: '✨', color: '#c9a227', label: 'Étoile filante' },
  { id: 'f-lotus',     emoji: '🪷', color: '#e8a0b5', label: 'Lotus' }
]

export const AVATARS = [...AVATARS_HOMMES, ...AVATARS_FEMMES]

// Récupère un avatar par son id. Retourne un avatar par défaut si introuvable.
export function findAvatar(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0]
}

// Retourne la liste d'avatars selon le sexe.
// sexe = 'homme' | 'femme'
export function avatarsForSexe(sexe) {
  if (sexe === 'femme') return AVATARS_FEMMES
  if (sexe === 'homme') return AVATARS_HOMMES
  return AVATARS // fallback : tous
}