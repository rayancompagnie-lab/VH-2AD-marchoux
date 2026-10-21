// utils/notifications.js
export async function requestNotificationPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Les notifications push ne sont pas supportées par ce navigateur.')
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    // Enregistrer le Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    
    // Récupérer l'abonnement existant ou en créer un nouveau
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe(subscribeOptions)
    }

    return subscription
  } catch (error) {
    console.error('Erreur notifications:', error)
    return null
  }
}

// Fonction utilitaire pour convertir la clé en tableau d'octets
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}