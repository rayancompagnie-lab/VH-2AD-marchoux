import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ref, onValue, set, remove, push, update } from 'firebase/database'
import { db } from '../firebase'

// Chargement unique du SDK Agora
if (typeof window !== 'undefined' && !window.AgoraRTC && !document.getElementById('agora-script')) {
  const script = document.createElement('script')
  script.id = 'agora-script'
  script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N.js'
  script.async = true
  document.body.appendChild(script)
}

export default function DirectAudio() {
  const { user, isAdmin, profile } = useAuth()
  const [liveData, setLiveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [auditeurs, setAuditeurs] = useState([])
  
  const clientRef = useRef(null)
  const localAudioTrackRef = useRef(null)
  const auditeursRef = useRef([])
  const isLeavingRef = useRef(false)

  // Nettoie les balises audio cachées du navigateur pour couper l'écho local
  function disableLocalPlayback() {
    document.querySelectorAll('audio').forEach((audio) => {
      if (audio.srcObject && audio.srcObject.getAudioTracks?.().length > 0) {
        audio.pause()
        audio.srcObject = null
      }
    })
  }

  const cleanupFirebase = async (force = false) => {
    if (isHost && user && (!isLeavingRef.current || force)) {
      isLeavingRef.current = true
      const liveSnap = await new Promise((resolve) => onValue(ref(db, 'live/direct'), resolve, { onlyOnce: true }))
      const data = liveSnap.val()
      
      if (data?.active && data.hostUid === user.uid) {
        await push(ref(db, 'live/historique'), {
          hostUid: user.uid,
          hostName: `${profile.prenom} ${profile.nom}`,
          startedAt: data.startedAt || Date.now(),
          endedAt: Date.now(),
          auditeurs: auditeursRef.current
        })
        await remove(ref(db, 'live/direct'))
        await remove(ref(db, 'live/auditeurs'))
      }
    }
  }

  useEffect(() => {
    const handleBeforeUnload = () => { if (isHost) cleanupFirebase() }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (isHost) cleanupFirebase()
    }
  }, [isHost, user])

  // Sécurité anti-fantôme
  useEffect(() => {
    const interval = setInterval(async () => {
      const snap = await new Promise((resolve) => onValue(ref(db, 'live/direct'), resolve, { onlyOnce: true }))
      const data = snap.val()
      if (data?.active && data.lastPing && Date.now() - data.lastPing > 15000) {
        await remove(ref(db, 'live/direct'))
        await remove(ref(db, 'live/auditeurs'))
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Ping pour dire qu'on est en vie
  useEffect(() => {
    if (!isHost) return
    const pingInterval = setInterval(() => { update(ref(db, 'live/direct'), { lastPing: Date.now() }) }, 5000)
    return () => clearInterval(pingInterval)
  }, [isHost])

  useEffect(() => {
    const unsub = onValue(ref(db, 'live/direct'), (snap) => {
      const data = snap.val()
      setLiveData(data)
      setLoading(false)
      if (!data?.active && joined && !isLeavingRef.current) leaveChannel(false)
    })
    return unsub
  }, [joined])

  useEffect(() => {
    if (!liveData?.active) return
    const unsub = onValue(ref(db, 'live/auditeurs'), (snap) => {
      const data = snap.val() || {}
      const list = Object.values(data)
      setAuditeurs(list)
      auditeursRef.current = list
    })
    return unsub
  }, [liveData?.active])

  async function joinChannel(asHost = false) {
    if (!window.AgoraRTC) return setError("SDK en chargement...")
    setError('')
    isLeavingRef.current = false
    
    try {
      const res = await fetch(`/api/agora-token?role=${asHost ? 'host' : 'audience'}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const client = window.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      clientRef.current = client

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        if (mediaType === 'audio') user.audioTrack.play()
      })

      await client.join(data.appId, data.channel, data.token, data.uid)

      if (asHost) {
        // Création de la piste micro
        const localAudioTrack = await window.AgoraRTC.createMicrophoneAudioTrack({ 
          AEC: true, 
          ANS: true 
        })
        localAudioTrackRef.current = localAudioTrack
        await client.publish([localAudioTrack])
        
        // 🚀 ON FORCE LA COUPURE DE L'ÉCHO LOCAL ICI
        disableLocalPlayback()
        
        await set(ref(db, 'live/direct'), {
          active: true, hostUid: user.uid, hostName: `${profile.prenom} ${profile.nom}`,
          startedAt: Date.now(), lastPing: Date.now()
        })
        setIsHost(true)
      } else {
        await set(ref(db, `live/auditeurs/${user.uid}`), {
          uid: user.uid, name: `${profile.prenom} ${profile.nom}`, joinedAt: Date.now()
        })
      }
      setJoined(true)
    } catch (err) {
      setError("Impossible de rejoindre : " + err.message)
    }
  }

  async function leaveChannel(updateFirebase = true) {
    if (isLeavingRef.current && updateFirebase) return
    if (updateFirebase) isLeavingRef.current = true

    if (updateFirebase && !isHost) await remove(ref(db, `live/auditeurs/${user.uid}`))
    if (localAudioTrackRef.current) { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close(); localAudioTrackRef.current = null }
    if (clientRef.current) { await clientRef.current.leave(); clientRef.current = null }

    if (updateFirebase && isHost) {
      await push(ref(db, 'live/historique'), {
        hostUid: user.uid, hostName: `${profile.prenom} ${profile.nom}`,
        startedAt: liveData?.startedAt || Date.now(), endedAt: Date.now(), auditeurs: auditeursRef.current
      })
      await remove(ref(db, 'live/direct'))
      await remove(ref(db, 'live/auditeurs'))
    }
    
    setJoined(false); setIsMuted(false); setIsHost(false)
    setTimeout(() => { isLeavingRef.current = false }, 500)
  }

  // 🚀 LA FAMEUSE FONCTION MUET CORRIGÉE
  async function toggleMute() {
    if (!localAudioTrackRef.current) return

    if (isMuted) {
      // Réactiver le micro
      await localAudioTrackRef.current.setEnabled(true)
      setIsMuted(false)
    } else {
      // Couper le micro (setEnabled arrête physiquement la capture)
      await localAudioTrackRef.current.setEnabled(false)
      setIsMuted(true)
    }
  }

  if (loading) return <p>Chargement...</p>

  const isLive = !!liveData?.active
  const canStartDirect = isAdmin && !isLive
  const amITheHostButNotConnected = isLive && liveData?.hostUid === user.uid && !joined

  return (
    <div className="direct-audio" style={{ textAlign: 'center', padding: 20 }}>
      <h2>🎙️ Direct Audio</h2>
      {error && <p className="error">{error}</p>}
      
      {amITheHostButNotConnected && (
        <div style={{ background: '#fff3cd', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <p style={{ color: 'var(--color-crimson-dark)', fontWeight: 'bold' }}>⚠️ Ancien direct resté ouvert.</p>
          <button onClick={() => cleanupFirebase(true)} style={{ background: 'var(--color-crimson)', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Forcer la fermeture</button>
        </div>
      )}

      {!isLive && !joined && (
        <div>
          <p className="muted-small">Aucun direct en cours.</p>
          {canStartDirect && <button onClick={() => joinChannel(true)} style={{ background: 'var(--color-crimson)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>🔴 Démarrer un direct</button>}
        </div>
      )}

      {isLive && !joined && !amITheHostButNotConnected && (
        <div>
          <p style={{ color: 'var(--color-crimson)', fontWeight: 'bold' }}>🔴 En direct avec {liveData?.hostName} !</p>
          <button onClick={() => joinChannel(false)} style={{ background: 'var(--color-teal)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>🎧 Écouter le direct</button>
        </div>
      )}

      {joined && (
        <div>
          <p style={{ color: 'var(--color-green)', fontWeight: 'bold', marginBottom: 20 }}>{isHost ? "✅ Vous êtes en direct" : "✅ Vous écoutez le direct"}</p>
          <div style={{ marginBottom: 20 }}>
            {isHost && (
              <button onClick={toggleMute} style={{ marginRight: 10, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isMuted ? 'var(--color-crimson)' : 'var(--color-green)', color: 'white', fontWeight: 'bold' }}>
                {isMuted ? '🎙️ Activer' : '🔇 Couper'}
              </button>
            )}
            <button onClick={() => leaveChannel(true)} style={{ background: 'var(--color-crimson-dark)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold' }}>
              {isHost ? "Arrêter" : "Quitter"}
            </button>
          </div>
          {(isHost || isAdmin) && (
            <div style={{ background: '#faf7ee', padding: 16, borderRadius: 12, maxWidth: 300, margin: '0 auto', border: '1px solid #ddd6c8' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-teal-dark)' }}>👥 Auditeurs ({auditeurs.length})</h3>
              {auditeurs.length === 0 && <p className="muted-small">Personne n'écoute...</p>}
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0 0', textAlign: 'left' }}>
                {auditeurs.map((a) => <li key={a.uid} style={{ padding: '6px 0', borderBottom: '1px solid #eee7d5', fontSize: 14 }}>🎧 {a.name}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}