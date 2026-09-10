// api/agora-token.js
// Fonction serverless Vercel — format ESM (cohérent avec "type": "module" du package.json)

import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

export default function handler(req, res) {
  try {
    const { channel, uid, role } = req.query || {}

    const appId = process.env.VITE_AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE

    if (!appId || !appCertificate) {
      return res.status(500).json({
        error: 'Configuration Agora manquante côté serveur.',
        details: {
          appIdPresent: !!appId,
          appCertificatePresent: !!appCertificate
        }
      })
    }

    if (!channel || !uid) {
      return res.status(400).json({ error: 'Paramètres "channel" et "uid" requis.' })
    }

    const agoraRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
    const expirationTimeInSeconds = 3600
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      channel,
      String(uid),
      agoraRole,
      privilegeExpiredTs
    )

    return res.status(200).json({ token })
  } catch (err) {
    return res.status(500).json({
      error: 'Erreur interne lors de la génération du token.',
      message: err.message
    })
  }
}