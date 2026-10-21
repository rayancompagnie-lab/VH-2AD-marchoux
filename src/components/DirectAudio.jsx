import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../firebase'

export default function DirectAudio() {
  const { user, isAdmin, profile } = useAuth()
  const [liveData, setLiveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isHost, setIsHost] = useState(false) // Sommes-nous celui qui a lancé le direct ?
  
  const clientRef = useRef(null)
  const localAudioTrackRef = useRef(null)

  // 1. Écouter l'état du direct dans Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, 'live/direct'), (snap) => {
      const data = snap.val()
      setLiveData(data)
      setLoading(false)
      
      // Si le direct est coupé par l'hôte (ou Firebase), on force la déconnexion
      if (!data?.active && joined) {
        leaveChannel(false)
      }
    })
    return unsub
  }, [joined])

  // 2. Charger le SDK Agora
  useEffect(() => {
    if (window.AgoraRTC) return
    const script = document.createElement('script')
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  async function joinChannel(asHost = false) {
    if (!window.AgoraRTC) {
      setError("SDK Agora en cours de chargement, réessaie dans 2 secondes.")
      return
    }
    setError('')
    
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
        
        // On sauvegarde QUI est l'hôte dans Firebase
        await set(ref(db, 'live/direct'), {
          active: true,
          hostUid: user.uid, // <-- Très important
          hostName: `${profile.prenom} ${profile.nom}`,
          startedAt: Date.now()
        })
        setIsHost(true)
      }
      
      setJoined(true)
    } catch (err) {
      console.error(err)
      setError("Impossible de rejoindre le direct : " + err.message)
    }
  }

  async function leaveChannel(updateFirebase = true) {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop()
      localAudioTrackRef.current.close()
      localAudioTrackRef.current = null
    }

    if (clientRef.current) {
      await clientRef.current.leave()
      clientRef.current = null
    }

    // Seul l'hôte peut supprimer le direct dans Firebase
    if (updateFirebase && isHost) {
      await remove(ref(db, 'live/direct'))
    }
    
    setJoined(false)
    setIsMuted(false)
    setIsHost(false)
  }

  async function toggleMute() {
    if (!localAudioTrackRef.current) return
    if (isMuted) {
      await localAudioTrackRef.current.setMuted(false)
    } else {
      await localAudioTrackRef.current.setMuted(true)
    }
    setIsMuted(!isMuted)
  }

  if (loading) return <p>Chargement...</p>

  const isLive = !!liveData?.active
  // Un admin peut lancer SEULEMENT si personne n'est en direct
  const canStartDirect = isAdmin && !isLive

  return (
    <div className="direct-audio" style={{ textAlign: 'center', padding: 20 }}>
      <h2>🎙️ Direct Audio</h2>
      {error && <p className="error">{error}</p>}

      {/* VUE : Personne n'est en direct */}
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

      {/* VUE : Un direct est en cours (Auditeur) */}
      {isLive && !joined && (
        <div>
          <p style={{ color: 'var(--color-crimson)', fontWeight: 'bold' }}>
            🔴 En direct maintenant avec {liveData?.hostName} !
          </p>
          <button onClick={() => joinChannel(false)} style={{ background: 'var(--color-teal)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>
            🎧 Écouter le direct
          </button>
          {/* Si c'est un autre admin, il ne peut pas relancer, seulement écouter */}
          {isAdmin && user.uid !== liveData?.hostUid && (
             <p className="muted-small" style={{ marginTop: 8 }}>En tant qu'admin, vous pouvez rejoindre pour écouter, mais un direct est déjà en cours.</p>
          )}
        </div>
      )}

      {/* VUE : Connecté au direct */}
      {joined && (
        <div>
          <p style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>
            {isHost ? "✅ Vous diffusez le direct" : "✅ Connecté (Auditeur)"}
          </p>
          
          {isHost && (
             <button onClick={toggleMute} style={{ marginRight: 10, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isMuted ? 'var(--color-crimson)' : 'var(--color-green)', color: 'white' }}>
               {isMuted ? '🎙️ Activer le micro' : '🔇 Couper le micro'}
             </button>
          )}
          
          <button onClick={() => leaveChannel(true)} style={{ background: 'var(--color-crimson-dark)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8 }}>
            Quitter
          </button>
        </div>
      )}
    </div>
  )
}