import { app, globalShortcut, systemPreferences, Tray, Menu, nativeImage } from 'electron'
import { createOverlayWindow, toggleOverlayVisibility } from './overlay'
import { registerIpcHandlers } from './ipc'
import path from 'path'

let tray: Tray | null = null

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

  // Create tray icon
  try {
    // Create a simple 16x16 icon programmatically (mic symbol)
    const iconSize = 16
    const icon = nativeImage.createEmpty()

    // Try to load from assets first
    const iconPath = path.join(__dirname, '../../assets/trayIcon.png')
    const fs = require('fs')
    if (fs.existsSync(iconPath)) {
      const loadedIcon = nativeImage.createFromPath(iconPath)
      loadedIcon.setTemplateImage(true)
      tray = new Tray(loadedIcon)
    } else {
      // Fallback: create a tiny canvas-based icon
      // Use a simple 16x16 buffer
      const { createCanvas } = (() => {
        try { return require('canvas') } catch { return { createCanvas: null } }
      })()

      if (createCanvas) {
        const canvas = createCanvas(16, 16)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(8, 6, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(6, 9, 4, 4)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(8, 10, 5, 0, Math.PI)
        ctx.stroke()
        const dataUrl = canvas.toDataURL()
        const trayIcon = nativeImage.createFromDataURL(dataUrl)
        trayIcon.setTemplateImage(true)
        tray = new Tray(trayIcon)
      } else {
        // Last fallback: use a 1x1 pixel icon
        const buf = Buffer.alloc(64) // 4x4 RGBA
        buf.fill(0xFF)
        const fallbackIcon = nativeImage.createFromBuffer(buf, { width: 4, height: 4 })
        fallbackIcon.setTemplateImage(true)
        tray = new Tray(fallbackIcon)
      }
    }

    if (tray) {
      tray.setToolTip('Interview AI')
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show/Hide Overlay',
          click: () => toggleOverlayVisibility(),
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => app.quit(),
        },
      ])
      tray.setContextMenu(contextMenu)
      tray.on('click', () => toggleOverlayVisibility())
    }
  } catch (err) {
    console.error('Failed to create tray icon:', err)
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
