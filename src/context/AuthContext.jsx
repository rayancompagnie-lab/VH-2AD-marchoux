import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth'
import { onValue, ref, set, update } from 'firebase/database'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { auth, db, googleProvider } from '../firebase'

const AuthContext = createContext(null)

function profileKey(uid) {
  return `user-profile-${uid}`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(!navigator.onLine)

  // Détection online/offline
  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Écoute l'auth Firebase + charge le profil depuis le cache immédiatement
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (!firebaseUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      // 🔑 Lecture du profil depuis IndexedDB tout de suite
      try {
        const cached = await idbGet(profileKey(firebaseUser.uid))
        if (cached) {
          console.log('📖 Profil lu depuis IndexedDB')
          setProfile(cached)
          setLoading(false)
        }
      } catch (e) {
        console.warn('Erreur lecture profil cache:', e)
      }

      // Si hors ligne, on s'arrête là
      if (!navigator.onLine) {
        console.log('📵 Hors ligne, on utilise le cache')
        setLoading(false)
        return
      }
    })
    return unsubscribe
  }, [])

  // Écoute les changements du profil Firebase
  useEffect(() => {
    if (!user) return

    const userRef = ref(db, `users/${user.uid}`)
    const unsubscribe = onValue(
      userRef,
      async (snapshot) => {
        const data = snapshot.val()
        setProfile(data)
        setLoading(false)

        if (data) {
          try {
            await idbSet(profileKey(user.uid), data)
          } catch (e) {
            console.warn('Erreur sauvegarde profil:', e)
          }
        }
      },
      (err) => {
        console.warn('Erreur Firebase profil:', err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [user])

  async function createMemberProfile(uid, data, complete = true) {
    const newProfile = {
      nom: data.nom || '',
      prenom: data.prenom || '',
      email: data.email,
      sexe: data.sexe || '',
      avatarId: data.avatarId || '',
      titre: data.titre || '',
      experience: data.experience || '',
      contact: data.contact || '',
      lieuHabitation: data.lieuHabitation || '',
      service: data.service || '',
      serviceVisible: !!data.serviceVisible,
      tribu: data.tribu || '',
      statutRelationnel: data.statutRelationnel || '',
      role: 'member',
      secteurs: {},
      badges: {},
      profileComplete: complete,
      createdAt: Date.now()
    }
    await set(ref(db, `users/${uid}`), newProfile)

    try {
      await idbSet(profileKey(uid), newProfile)
    } catch (e) {}
  }

  async function completeMemberProfile(uid, data) {
    const updates = {
      sexe: data.sexe || '',
      avatarId: data.avatarId || '',
      titre: data.titre || '',
      experience: data.experience || '',
      contact: data.contact,
      lieuHabitation: data.lieuHabitation || '',
      service: data.service || '',
      serviceVisible: !!data.serviceVisible,
      tribu: data.tribu || '',
      statutRelationnel: data.statutRelationnel || '',
      profileComplete: true
    }
    await update(ref(db, `users/${uid}`), updates)

    try {
      const cached = (await idbGet(profileKey(uid))) || {}
      await idbSet(profileKey(uid), { ...cached, ...updates })
    } catch (e) {}
  }

  async function registerWithEmail({ email, password, ...rest }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: `${rest.prenom} ${rest.nom}` })
    await createMemberProfile(cred.user.uid, { email, ...rest }, true)
    return cred.user
  }

  async function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider)
    const existing = await new Promise((resolve) => {
      onValue(ref(db, `users/${cred.user.uid}`), (snap) => resolve(snap.val()), { onlyOnce: true })
    })
    if (!existing) {
      const [prenom, ...nomParts] = (cred.user.displayName || 'Membre').split(' ')
      await createMemberProfile(
        cred.user.uid,
        { email: cred.user.email, prenom, nom: nomParts.join(' ') || '' },
        false
      )
    }
    return cred.user
  }

  function logout() {
    return signOut(auth)
  }

  const isAdminValue = profile?.role === 'admin'

  function canManage(secteur) {
    return isAdminValue || !!profile?.secteurs?.[secteur]
  }

  const value = {
    user,
    profile,
    loading,
    offline,
    isAdmin: isAdminValue,
    isSemiAdmin: profile?.role === 'semiAdmin' || isAdminValue,
    isPremium: !!profile?.premium || isAdminValue,
    canManage,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    completeMemberProfile,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}