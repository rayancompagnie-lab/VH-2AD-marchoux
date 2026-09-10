// Badges automatiques attribués à l'inscription (non modifiables par un admin,
// calculés directement à partir du profil).

export const TRIBUS = [
  { key: 'ruben', label: 'Ruben', color: '#7b1e3a' },
  { key: 'simeon', label: 'Siméon', color: '#e67e22' },
  { key: 'levi', label: 'Lévi', color: '#2ecc71' },
  { key: 'juda', label: 'Juda', color: '#e74c3c' },
  { key: 'zabulon', label: 'Zabulon', color: '#3498db' },
  { key: 'issacar', label: 'Issacar', color: '#d4af37' },
  { key: 'dan', label: 'Dan', color: '#1a3e6e' },
  { key: 'gad', label: 'Gad', color: '#f1c40f' },
  { key: 'aser', label: 'Aser', color: '#8e44ad' },
  { key: 'nephtali', label: 'Nephtali', color: '#7ed957' },
  { key: 'joseph', label: 'Joseph', color: '#6b3e26' },
  { key: 'benjamin', label: 'Benjamin', color: '#f0a868' }
]

export const STATUTS = [
  { key: 'marie', label: 'Marié(e)', color: '#1abc9c' },
  { key: 'cheminant', label: 'Cheminant(e)', color: '#e67e22' },
  { key: 'celibataire', label: 'Célibataire', color: '#3498db' }
]

export function findTribu(key) {
  return TRIBUS.find((t) => t.key === key)
}

export function findStatut(key) {
  return STATUTS.find((s) => s.key === key)
}
