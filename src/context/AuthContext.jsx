import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth'
import { onValue, ref, serverTimestamp, set } from 'firebase/database'
import { auth, db, googleProvider } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) return
    const userRef = ref(db, `users/${user.uid}`)
    const unsubscribe = onValue(userRef, (snapshot) => {
      setProfile(snapshot.val())
      setLoading(false)
    })
    return unsubscribe
  }, [user])

  // Crée la fiche membre dans la Realtime Database après inscription
  async function createMemberProfile(uid, data, complete = true) {
    await set(ref(db, `users/${uid}`), {
      nom: data.nom || '',
      prenom: data.prenom || '',
      email: data.email,
      titre: data.titre || '',
      experience: data.experience || '',
      contact: data.contact || '',
      contactVisible: !!data.contactVisible,
      lieuHabitation: data.lieuHabitation || '',
      lieuVisible: !!data.lieuVisible,
      service: data.service || '',
      serviceVisible: !!data.serviceVisible,
      photoPrincipale: data.photoPrincipale || '',
      photoSecondaire: data.photoSecondaire || '',
      role: 'member', // 'member' | 'semiAdmin' | 'admin'
      secteurs: {}, // pour les semi-admins : { actualites, infosTravail, marche, temoignages }
      badges: {},
      profileComplete: complete,
      createdAt: serverTimestamp()
    })
  }

  // Complète une fiche créée automatiquement via Google (le contact est obligatoire
  // mais Google ne le fournit pas, donc l'app redirige vers /completer-profil)
  async function completeMemberProfile(uid, data) {
    await set(ref(db, `users/${uid}`), {
      ...profile,
      titre: data.titre || '',
      experience: data.experience || '',
      contact: data.contact,
      contactVisible: !!data.contactVisible,
      lieuHabitation: data.lieuHabitation || '',
      lieuVisible: !!data.lieuVisible,
      service: data.service || '',
      serviceVisible: !!data.serviceVisible,
      profileComplete: true
    })
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

  // Le contact étant obligatoire mais non fourni par Google, un profil "incomplet"
  // est créé puis l'app redirige l'utilisateur vers la page de complétion.
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

  // Un semi-admin ne gère que le(s) secteur(s) qui lui ont été confiés
  // (ex: "marche", "actualites", "infosTravail", "temoignages"). Un admin
  // gère tout automatiquement.
  function canManage(secteur) {
    return isAdminValue || !!profile?.secteurs?.[secteur]
  }

  const value = {
    user,
    profile,
    loading,
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
