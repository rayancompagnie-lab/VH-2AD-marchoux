import { useEffect, useMemo, useState } from 'react'
import { get, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { findTribu, findStatut } from '../utils/groups'
import ServiceDirectory from '../components/ServiceDirectory'
import PostFeed from '../components/PostFeed'
import PostComposer from '../components/PostComposer'
import AdminPanel from '../components/AdminPanel'
import Marketplace from '../components/Marketplace'
import Testimonies from '../components/Testimonies'
import PremiumBadge from '../components/PremiumBadge'
import GroupBoard from '../components/GroupBoard'
import LeamanBoard from '../components/LeamanBoard'
import KanegnonBoard from '../components/KanegnonBoard'
import Avatar from '../components/Avatar'
import MyProfile from './MyProfile'
import Attendance from './Attendance'
import AttendanceReport from '../components/AttendanceReport'

const STATIC_TABS = [
  'Service',
  'Actualités',
  'Infos travail',
  'Marché',
  'Témoignages',
  'Présence',
  'Mon profil',
  'Rapport de présence',
  'Administration'
]

export default function Home() {
  const { profile, isSemiAdmin, isAdmin, isPremium, canManage, logout } = useAuth()
  const [tab, setTab] = useState('Service')
  const [allUsers, setAllUsers] = useState({})
  const [allBadges, setAllBadges] = useState({})

  useEffect(() => {
    async function loadData() {
      try {
        const usersSnap = await get(ref(db, 'users'))
        setAllUsers(usersSnap.val() || {})
        const badgesSnap = await get(ref(db, 'badges'))
        setAllBadges(badgesSnap.val() || {})
      } catch (err) {
        console.error('Erreur chargement:', err)
      }
    }
    loadData()
  }, [])

  const myGroups = useMemo(() => {
    if (!profile) return []
    const users = Object.values(allUsers)
    const groups = []

    if (profile.tribu) {
      const count = users.filter((u) => u.tribu === profile.tribu).length
      if (count >= 2) {
        const t = findTribu(profile.tribu)
        groups.push({ path: `tribu-${profile.tribu}`, label: t ? t.label : profile.tribu })
      }
    }

    if (profile.statutRelationnel) {
      const count = users.filter((u) => u.statutRelationnel === profile.statutRelationnel).length
      if (count >= 2) {
        const s = findStatut(profile.statutRelationnel)
        groups.push({ path: `statut-${profile.statutRelationnel}`, label: s ? s.label : profile.statutRelationnel })
      }
    }

    Object.keys(profile.badges || {}).forEach((badgeId) => {
      const count = users.filter((u) => u.badges?.[badgeId]).length
      if (count >= 2) {
        groups.push({ path: `badge-${badgeId}`, label: allBadges[badgeId]?.name || 'Badge' })
      }
    })

    return groups
  }, [profile, allUsers, allBadges])

  const visibleTabs = [
    ...STATIC_TABS.filter((t) => {
      if (t === 'Administration' && !isAdmin) return false
      if (t === 'Rapport de présence' && !isAdmin) return false
      return true
    }),
    ...(profile?.sexe === 'femme' ? ['Leaman'] : []),
    ...(profile?.sexe === 'homme' ? ['Kanegnon'] : []),
    ...myGroups.map((g) => g.label)
  ]

  const activeGroup = myGroups.find((g) => g.label === tab)

  return (
    <div className="home">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="Vase d'honneur" className="logo" />
          <h1>Vase d'honneur — 2AD Marchoux</h1>
        </div>
        <div className="user-chip">
          <button className="user-mini" onClick={() => setTab('Mon profil')} title="Voir mon profil">
            <Avatar avatarId={profile?.avatarId} size={26} name={profile?.prenom} />
            <span>
              {profile?.prenom} {profile?.nom}
              {isAdmin && ' (Admin)'} {!isAdmin && isSemiAdmin && ' (Semi-admin)'}
              <PremiumBadge show={isPremium} />
            </span>
          </button>
          <button className="logout-btn" onClick={logout}>Déconnexion</button>
        </div>
      </header>

      <nav className="tabs">
        {visibleTabs.map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      <main className="tab-content">
        {tab === 'Service' && <ServiceDirectory />}
        {tab === 'Actualités' && (
          <div>
            {canManage('actualites') && (
              <PostComposer basePath="posts/culte" defaultDurationHours={24} />
            )}
            <PostFeed basePath="posts/culte" canDelete={canManage('actualites')} />
          </div>
        )}
        {tab === 'Infos travail' && (
          <div>
            {canManage('infosTravail') && (
              <PostComposer basePath="posts/travail" defaultDurationHours={168} />
            )}
            <PostFeed basePath="posts/travail" canDelete={canManage('infosTravail')} />
          </div>
        )}
        {tab === 'Marché' && <Marketplace />}
        {tab === 'Témoignages' && <Testimonies />}
        {tab === 'Présence' && <Attendance />}
        {tab === 'Mon profil' && <MyProfile />}
        {tab === 'Rapport de présence' && isAdmin && <AttendanceReport />}
        {tab === 'Administration' && isAdmin && <AdminPanel />}
        {tab === 'Leaman' && profile?.sexe === 'femme' && <LeamanBoard />}
        {tab === 'Kanegnon' && profile?.sexe === 'homme' && <KanegnonBoard />}
        {activeGroup && <GroupBoard groupPath={activeGroup.path} title={activeGroup.label} />}
      </main>
    </div>
  )
}