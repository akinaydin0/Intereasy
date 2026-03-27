import { app, globalShortcut, systemPreferences } from 'electron'
import { createOverlayWindow, toggleOverlayVisibility } from './overlay'
import { registerIpcHandlers } from './ipc'

app.whenReady().then(async () => {
  // Request microphone permission on macOS
  if (process.platform === 'darwin') {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    console.log('Microphone permission status:', micStatus)
    if (micStatus !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      console.log('Microphone permission granted:', granted)
    }

    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    console.log('Screen capture permission status:', screenStatus)
  }

  const overlayWindow = createOverlayWindow()

  registerIpcHandlers(overlayWindow)

  // Global shortcut: Cmd/Ctrl+Shift+Space → toggle overlay
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleOverlayVisibility()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
