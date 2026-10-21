import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listenCultes } from '../utils/cultes'
import { listenAllPatriarches, getTribuOfPatriarche } from '../utils/patriarches'
import { listenAllDelegatedMembers } from '../utils/delegatedMembers'
import { formatDateFr } from '../utils/attendance'
import AttendanceTribu from '../components/AttendanceTribu'
import AttendanceAdmin from '../components/AttendanceAdmin'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { TRIBUS } from '../utils/groups'

export default function Attendance() {
  const { user, profile, isAdmin } = useAuth()
  const [cultes, setCultes] = useState([])
  const [patriarchesMap, setPatriarchesMap] = useState({})
  const [allAttendance, setAllAttendance] = useState({})
  const [allUsers, setAllUsers] = useState({})
  const [delegatedMembers, setDelegatedMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubC = listenCultes((list) => {
      setCultes(list)
      setLoading(false)
    })
    const unsubP = listenAllPatriarches(setPatriarchesMap)
    const unsubD = listenAllDelegatedMembers(setDelegatedMembers)
    const unsubA = onValue(ref(db, 'attendance'), (snap) => {
      setAllAttendance(snap.val() || {})
    })
    const unsubU = onValue(ref(db, 'users'), (snap) => {
      setAllUsers(snap.val() || {})
    })

    return () => {
      unsubC(); unsubP(); unsubD(); unsubA(); unsubU()
    }
  }, [])

  const myTribuAsPatriarche = getTribuOfPatriarche(user?.uid, patriarchesMap)
  const amIPatriarche = !!myTribuAsPatriarche

  if (!amIPatriarche && !isAdmin) {
    return (
      <div className="attendance">
        <h2>Présence</h2>
        <p className="muted-small">
          Cet onglet est réservé aux Patriarches et aux Administrateurs.
        </p>
      </div>
    )
  }

  if (loading) return <div className="loading">Chargement...</div>

  if (cultes.length === 0) {
    return (
      <div className="attendance">
        <h2>Présence</h2>
        <p className="muted-small">
          Aucun culte programmé. {isAdmin && 'Programme un culte depuis le panneau Administration.'}
        </p>
      </div>
    )
  }

  return (
    <div className="attendance">
      <h2>Présence</h2>

      {amIPatriarche && !isAdmin && (
        <AttendanceTribu
          tribuKey={myTribuAsPatriarche}
          tribuLabel={TRIBUS.find((t) => t.key === myTribuAsPatriarche)?.label || myTribuAsPatriarche}
          cultes={cultes}
          allAttendance={allAttendance}
          allUsers={allUsers}
          delegatedMembers={delegatedMembers}
        />
      )}

      {isAdmin && (
        <AttendanceAdmin
          cultes={cultes}
          allAttendance={allAttendance}
          allUsers={allUsers}
          delegatedMembers={delegatedMembers}
          patriarchesMap={patriarchesMap}
          myTribuAsPatriarche={myTribuAsPatriarche}
        />
      )}
    </div>
  )
}