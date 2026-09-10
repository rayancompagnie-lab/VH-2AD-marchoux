import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { getCulteSlots, todayKey, isPatriarche } from '../utils/attendance'
import AttendanceMember from '../components/AttendanceMember'
import AttendancePatriarche from '../components/AttendancePatriarche'

export default function Attendance() {
  const { user, profile, isAdmin } = useAuth()
  const [allBadges, setAllBadges] = useState({})
  const [config, setConfig] = useState({ culte3Special: false })
  const [todayData, setTodayData] = useState({})

  const today = todayKey()

  useEffect(() => {
    const unsubBadges = onValue(ref(db, 'badges'), (s) => setAllBadges(s.val() || {}))
    const unsubConfig = onValue(ref(db, 'config'), (s) => setConfig(s.val() || { culte3Special: false }))
    return () => {
      unsubBadges()
      unsubConfig()
    }
  }, [])

  useEffect(() => {
    const unsub = onValue(ref(db, `attendance/${today}`), (s) => setTodayData(s.val() || {}))
    return unsub
  }, [today])

  const slots = getCulteSlots(new Date(), config)
  const amIPatriarche = isPatriarche(profile, allBadges)

  if (slots.length === 0) {
    return (
      <div className="attendance">
        <h2>Présence</h2>
        <p className="muted-small">Aucun culte aujourd'hui.</p>
        <p>Les jours de culte sont : <strong>dimanche</strong> (à partir de 6h) et <strong>mercredi</strong> (à partir de 17h).</p>
      </div>
    )
  }

  return (
    <div className="attendance">
      <h2>Présence</h2>

      {slots.map((slot) => (
        <div key={slot.key} className="culte-section" style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'var(--color-teal-dark)' }}>{slot.label}</h3>

          {amIPatriarche ? (
            <AttendancePatriarche
              culteKey={slot.key}
              culteLabel={slot.label}
              todayKey={today}
              todayData={todayData}
              allBadges={allBadges}
            />
          ) : (
            <AttendanceMember
              culteKey={slot.key}
              culteLabel={slot.label}
              todayKey={today}
              todayData={todayData}
            />
          )}
        </div>
      ))}
    </div>
  )
}