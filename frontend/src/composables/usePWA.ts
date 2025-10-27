import { ref, onMounted } from 'vue'

export const usePWA = () => {
  const showInstallPrompt = ref(false)
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isOnline = ref(navigator.onLine)
  const isInstalled = ref(false)
  const showUpdatePrompt = ref(false)
  const needRefresh = ref(false)

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }

  const checkInstallStatus = () => {
    // Check if app is installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://')
    
    isInstalled.value = isStandalone
    
    // Check if user has dismissed install prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      if (dismissedTime > oneWeekAgo) {
        showInstallPrompt.value = false
        return
      }
    }

    showInstallPrompt.value = !isStandalone
  }

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    checkInstallStatus()
  }

  const installApp = async () => {
    if (!deferredPrompt.value) return false

    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      showInstallPrompt.value = false
      deferredPrompt.value = null
      return true
    } else {
      console.log('User dismissed the install prompt')
      showInstallPrompt.value = false
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
      deferredPrompt.value = null
      return false
    }
  }

  const dismissInstallPrompt = () => {
    showInstallPrompt.value = false
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  const handleUpdate = async () => {
    // Reload page to get new service worker
    window.location.reload()
  }

  const skipUpdate = () => {
    showUpdatePrompt.value = false
  }

  const handleOffline = () => {
    isOnline.value = false
  }

  const handleOnline = () => {
    isOnline.value = true
  }

  // Check for service worker updates
  const checkForUpdates = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update()
      })
    }
  }

  onMounted(() => {
    checkInstallStatus()
    checkForUpdates()
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      console.log('App was installed')
      isInstalled.value = true
      showInstallPrompt.value = false
      deferredPrompt.value = null
    })
  })

  return {
    showInstallPrompt,
    isOnline,
    isInstalled,
    showUpdatePrompt,
    installApp,
    dismissInstallPrompt,
    handleUpdate,
    skipUpdate
  }
}
