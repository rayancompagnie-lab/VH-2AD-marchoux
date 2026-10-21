import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../firebase'

export default function DirectAudio() {
  const { user, isAdmin, profile } = useAuth()
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  const clientRef = useRef(null)
  const localAudioTrackRef = useRef(null) // On garde une référence à notre micro

  useEffect(() => {
    const unsub = onValue(ref(db, 'live/direct'), (snap) => {
      const data = snap.val()
      setIsLive(!!data?.active)
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (window.AgoraRTC) return
    const script = document.createElement('script')
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  async function joinChannel(asHost = false) {
    if (!window.AgoraRTC) {
      setError("SDK Agora en cours de chargement...")
      return
    }
    setError('')
    
    try {
      const res = await fetch(`/api/agora-token?role=${asHost ? 'host' : 'audience'}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const client = window.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      clientRef.current = client

      // ÉCOUTE DES AUTRES
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        if (mediaType === 'audio') {
          user.audioTrack.play()
        }
      })

      await client.join(data.appId, data.channel, data.token, data.uid)

      // SI C'EST L'HÔTE
      if (asHost) {
        const localAudioTrack = await window.AgoraRTC.createMicrophoneAudioTrack({
          AEC: true, // Active l'annulation d'écho
          ANS: true  // Active la suppression de bruit
        })
        localAudioTrackRef.current = localAudioTrack // On sauvegarde la piste
        
        // ⚠️ IMPORTANT : On publie le son MAIS on ne le joue pas en local (playAudio = false par défaut)
        await client.publish([localAudioTrack])
        
        await set(ref(db, 'live/direct'), {
          active: true,
          hostName: `${profile.prenom} ${profile.nom}`,
          startedAt: Date.now()
        })
      }
      
      setJoined(true)
    } catch (err) {
      console.error(err)
      setError("Impossible de rejoindre le direct : " + err.message)
    }
  }

  async function leaveChannel() {
    // 1. Couper et détruire le micro physique
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop()
      localAudioTrackRef.current.close()
      localAudioTrackRef.current = null
    }

    // 2. Quitter le canal
    if (clientRef.current) {
      await clientRef.current.leave()
      clientRef.current = null
    }

    if (isAdmin) {
      await remove(ref(db, 'live/direct'))
    }
    setJoined(false)
    setIsMuted(false)
  }

  // Fonction Muet corrigée
  async function toggleMute() {
    if (!localAudioTrackRef.current) return
    
    if (isMuted) {
      await localAudioTrackRef.current.setMuted(false) // Réactiver le son
    } else {
      await localAudioTrackRef.current.setMuted(true) // Couper le son
    }
    setIsMuted(!isMuted)
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div className="direct-audio" style={{ textAlign: 'center', padding: 20 }}>
      <h2>🎙️ Direct Audio</h2>
      {error && <p className="error">{error}</p>}

      {!isLive && !joined && (
        <div>
          <p className="muted-small">Aucun direct en cours pour le moment.</p>
          {isAdmin && (
            <button onClick={() => joinChannel(true)} style={{ background: 'var(--color-crimson)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>
              🔴 Démarrer un direct
            </button>
          )}
        </div>
      )}

      {isLive && !joined && (
        <div>
          <p style={{ color: 'var(--color-crimson)', fontWeight: 'bold' }}>🔴 En direct maintenant !</p>
          <button onClick={() => joinChannel(false)} style={{ background: 'var(--color-teal)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>
            🎧 Écouter le direct
          </button>
        </div>
      )}

      {joined && (
        <div>
          <p style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>✅ Connecté au direct</p>
          {isAdmin && (
             <button onClick={toggleMute} style={{ marginRight: 10, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isMuted ? 'var(--color-crimson)' : 'var(--color-green)', color: 'white' }}>
               {isMuted ? '🎙️ Activer le micro' : '🔇 Couper le micro'}
             </button>
          )}
          <button onClick={leaveChannel} style={{ background: 'var(--color-crimson-dark)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8 }}>
            Quitter
          </button>
        </div>
      )}
    </div>
  )
}