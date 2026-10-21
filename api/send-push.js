import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:ton-email@exemple.com',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { subscriptions, title, body, url } = req.body

  try {
    const notifications = subscriptions.map((sub) => {
      return webpush.sendNotification(sub, JSON.stringify({ title, body, url }))
    })
    await Promise.all(notifications)
    res.status(200).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}