import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ref, onValue, set, remove, push } from 'firebase/database'
import { db } from '../firebase'

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
  const isLeavingRef = useRef(false) // 🔒 Verrou pour éviter le double déclenchement

  function disableLocalPlayback() {
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach((audio) => {
      if (audio.srcObject && audio.srcObject.getAudioTracks && audio.srcObject.getAudioTracks().length > 0) {
        audio.pause()
        audio.srcObject = null
      }
    })
  }

  const cleanupFirebase = async () => {
    if (isHost && user && !isLeavingRef.current) {
      isLeavingRef.current = true
      const liveSnap = await new Promise((resolve) => {
        onValue(ref(db, 'live/direct'), resolve, { onlyOnce: true })
      })
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
    const handleBeforeUnload = () => {
      if (isHost) cleanupFirebase()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (isHost) cleanupFirebase()
    }
  }, [isHost, user])

  useEffect(() => {
    const unsub = onValue(ref(db, 'live/direct'), (snap) => {
      const data = snap.val()
      setLiveData(data)
      setLoading(false)
      
      // Si le direct est coupé (par nous ou par un autre admin) et qu'on est encore connecté
      if (!data?.active && joined && !isLeavingRef.current) {
        leaveChannel(false)
      }
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

  useEffect(() => {
    if (window.AgoraRTC) return
    const script = document.createElement('script')
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  async function joinChannel(asHost = false) {
    if (!window.AgoraRTC) return setError("SDK en chargement...")
    setError('')
    isLeavingRef.current = false // On réinitialise le verrou
    
    try {
      const res = await fetch(`/api/agora-token?role=${asHost ? 'host' : 'audience'}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const client = window.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      clientRef.current = client

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        if (mediaType === 'audio') {
          user.audioTrack.play()
        }
      })

      await client.join(data.appId, data.channel, data.token, data.uid)

      if (asHost) {
        const localAudioTrack = await window.AgoraRTC.createMicrophoneAudioTrack({
          AEC: true, 
          ANS: true
        })
        localAudioTrackRef.current = localAudioTrack
        await client.publish([localAudioTrack])
        disableLocalPlayback()
        
        await set(ref(db, 'live/direct'), {
          active: true,
          hostUid: user.uid,
          hostName: `${profile.prenom} ${profile.nom}`,
          startedAt: Date.now()
        })
        setIsHost(true)
      } else {
        await set(ref(db, `live/auditeurs/${user.uid}`), {
          uid: user.uid,
          name: `${profile.prenom} ${profile.nom}`,
          joinedAt: Date.now()
        })
      }
      
      setJoined(true)
    } catch (err) {
      console.error(err)
      setError("Impossible de rejoindre : " + err.message)
    }
  }

  async function leaveChannel(updateFirebase = true) {
    // Si on a déjà cliqué sur le bouton, on ne fait rien
    if (isLeavingRef.current && updateFirebase) return
    if (updateFirebase) isLeavingRef.current = true

    // On fait le nettoyage audio et Agora
    if (updateFirebase && !isHost) {
      await remove(ref(db, `live/auditeurs/${user.uid}`))
    }

    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop()
      localAudioTrackRef.current.close()
      localAudioTrackRef.current = null
    }

    if (clientRef.current) {
      await clientRef.current.leave()
      clientRef.current = null
    }

    if (updateFirebase && isHost) {
      await push(ref(db, 'live/historique'), {
        hostUid: user.uid,
        hostName: `${profile.prenom} ${profile.nom}`,
        startedAt: liveData?.startedAt || Date.now(),
        endedAt: Date.now(),
        auditeurs: auditeursRef.current
      })
      await remove(ref(db, 'live/direct'))
      await remove(ref(db, 'live/auditeurs'))
    }
    
    // On remet l'interface à zéro
    setJoined(false)
    setIsMuted(false)
    setIsHost(false)
    
    // On laisse un petit délai avant de libérer le verrou pour que l'interface se mette à jour
    setTimeout(() => {
      isLeavingRef.current = false
    }, 500)
  }

  async function toggleMute() {
    if (!localAudioTrackRef.current) return
    if (isMuted) await localAudioTrackRef.current.setMuted(false)
    else await localAudioTrackRef.current.setMuted(true)
    setIsMuted(!isMuted)
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
          <p style={{ color: 'var(--color-crimson-dark)', fontWeight: 'bold' }}>
            ⚠️ Vous avez un ancien direct resté ouvert.
          </p>
          <button 
            onClick={async () => {
              await remove(ref(db, 'live/direct'))
              await remove(ref(db, 'live/auditeurs'))
            }}
            style={{ background: 'var(--color-crimson)', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
          >
            Forcer la fermeture
          </button>
        </div>
      )}

      {!isLive && !joined && (
        <div>
          <p className="muted-small">Aucun direct en cours pour le moment.</p>
          {canStartDirect && (
            <button onClick={() => joinChannel(true)} style={{ background: 'var(--color-crimson)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>
              🔴 Démarrer un direct
            </button>
          )}
        </div>
      )}

      {isLive && !joined && !amITheHostButNotConnected && (
        <div>
          <p style={{ color: 'var(--color-crimson)', fontWeight: 'bold' }}>
            🔴 En direct maintenant avec {liveData?.hostName} !
          </p>
          <button onClick={() => joinChannel(false)} style={{ background: 'var(--color-teal)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>
            🎧 Écouter le direct
          </button>
        </div>
      )}

      {joined && (
        <div>
          <p style={{ color: 'var(--color-green)', fontWeight: 'bold', marginBottom: 20 }}>
            {isHost ? "✅ Vous êtes en direct (Micro ouvert)" : "✅ Vous écoutez le direct"}
          </p>
          
          <div style={{ marginBottom: 20 }}>
            {isHost && (
              <button onClick={toggleMute} style={{ marginRight: 10, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isMuted ? 'var(--color-crimson)' : 'var(--color-green)', color: 'white', fontWeight: 'bold' }}>
                {isMuted ? '🎙️ Activer le micro' : '🔇 Couper le micro'}
              </button>
            )}
            <button onClick={() => leaveChannel(true)} style={{ background: 'var(--color-crimson-dark)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold' }}>
              {isHost ? "Arrêter le direct" : "Quitter le direct"}
            </button>
          </div>

          {(isHost || isAdmin) && (
            <div style={{ background: '#faf7ee', padding: 16, borderRadius: 12, maxWidth: 300, margin: '0 auto', border: '1px solid #ddd6c8' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-teal-dark)' }}>
                👥 Auditeurs en direct ({auditeurs.length})
              </h3>
              {auditeurs.length === 0 && <p className="muted-small">Personne n'écoute pour le moment...</p>}
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0 0', textAlign: 'left' }}>
                {auditeurs.map((a) => (
                  <li key={a.uid} style={{ padding: '6px 0', borderBottom: '1px solid #eee7d5', fontSize: 14 }}>
                    🎧 {a.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}