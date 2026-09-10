// api/agora-token.js
// Fonction serverless Vercel — format CommonJS (compatible agora-access-token)
// Le fichier api/package.json avec {"type":"commonjs"} force ce format.

const { RtcTokenBuilder, RtcRole } = require('agora-access-token')

module.exports = (req, res) => {
  try {
    const { channel, uid, role } = req.query || {}

    const appId = process.env.VITE_AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE

    if (!appId || !appCertificate) {
      res.status(500).json({
        error: 'Configuration Agora manquante côté serveur.',
        details: {
          appIdPresent: !!appId,
          appCertificatePresent: !!appCertificate
        }
      })
      return
    }

    if (!channel || !uid) {
      res.status(400).json({ error: 'Paramètres "channel" et "uid" requis.' })
      return
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

    res.status(200).json({ token })
  } catch (err) {
    res.status(500).json({
      error: 'Erreur interne lors de la génération du token.',
      message: err.message,
      stack: err.stack
    })
  }
}