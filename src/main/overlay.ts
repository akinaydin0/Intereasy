// ================================================
// Interview AI — Overlay Window
// THE MOST CRITICAL FILE: screen share invisibility
// ================================================

import { BrowserWindow, screen } from 'electron'
import path from 'path'

let overlayWindow: BrowserWindow | null = null

export function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  overlayWindow = new BrowserWindow({
    width: 420,
    height: 600,
    x: width - 440,      // Top-right corner by default
    y: 20,
    
    // ⚡ CRITICAL: These make the window invisible to screen share
    transparent: true,
    frame: false,
    hasShadow: false,
    
    // Always on top of everything
    alwaysOnTop: true,
    
    // Don't show in taskbar/dock
    skipTaskbar: true,
    
    // Window type affects screen capture exclusion
    type: process.platform === 'darwin' ? 'panel' : 'toolbar',
    
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    
    // Visual
    backgroundColor: '#00000000',  // Fully transparent
    roundedCorners: true,
    resizable: true,
    movable: true,
  })

  // ⚡ THIS IS THE KEY — excludes window from screen capture
  overlayWindow.setContentProtection(true)
  
  // Always on top with highest priority
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  
  // Visible on all virtual desktops/spaces
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Show DevTools in development to debug issues
  if (process.env.NODE_ENV === 'development') {
    overlayWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    overlayWindow.loadURL('http://localhost:5173')
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Show window once content is ready
  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('Overlay window loaded successfully')
    overlayWindow?.show()
    overlayWindow?.focus()
  })

  overlayWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    console.error('Overlay failed to load:', errorCode, errorDesc)
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  return overlayWindow
}

export function toggleOverlayVisibility(): void {
  if (!overlayWindow) return
  
  if (overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.show()
    overlayWindow.focus()
  }
}

export function setOverlayPosition(x: number, y: number): void {
  overlayWindow?.setPosition(x, y)
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}
