import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'
import http from 'http'
import Store from 'electron-store'
import { TranscriptLine } from '../shared/types'

const store = new Store()

const WHISPER_PORT = 8787
const WHISPER_SERVER_URL = `http://127.0.0.1:${WHISPER_PORT}`

// The pipx venv Python that has whisper installed
const PIPX_PYTHON = path.join(os.homedir(), '.local/pipx/venvs/openai-whisper/bin/python3')
const FALLBACK_PYTHONS = [
  path.join(os.homedir(), '.local/pipx/venvs/openai-whisper/bin/python'),
  '/opt/homebrew/bin/python3',
  '/usr/local/bin/python3',
  'python3',
]

let whisperProcess: ChildProcess | null = null
let serverReady = false

function findPython(): string {
  if (existsSync(PIPX_PYTHON)) return PIPX_PYTHON
  for (const p of FALLBACK_PYTHONS) {
    if (p === 'python3' || existsSync(p)) return p
  }
  return 'python3'
}

function getServerScript(): string {
  // In development, it's in the project root scripts/
  const devPath = path.join(__dirname, '../../scripts/whisper_server.py')
  if (existsSync(devPath)) return devPath
  // In production, bundled alongside the app
  const prodPath = path.join(process.resourcesPath || '', 'scripts/whisper_server.py')
  if (existsSync(prodPath)) return prodPath
  return devPath
}

export async function startWhisperServer(): Promise<boolean> {
  // Check if server is already running
  if (serverReady) return true
  if (await isServerRunning()) {
    serverReady = true
    return true
  }

  const pythonBin = findPython()
  const serverScript = getServerScript()
  const whisperModel = (store.get('settings.whisperModel', 'base') as string)
  const language = (store.get('settings.language', 'en') as string)

  console.log(`[audio] Starting whisper server: ${pythonBin} ${serverScript}`)
  console.log(`[audio] Model: ${whisperModel}, Language: ${language}`)

  return new Promise((resolve) => {
    whisperProcess = spawn(pythonBin, [serverScript], {
      env: {
        ...process.env,
        WHISPER_MODEL: whisperModel,
        WHISPER_LANGUAGE: language,
        WHISPER_PORT: String(WHISPER_PORT),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let startTimeout: NodeJS.Timeout

    whisperProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      console.log(msg)
      if (msg.includes('Listening on')) {
        serverReady = true
        clearTimeout(startTimeout)
        resolve(true)
      }
    })

    whisperProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      if (msg) console.error('[whisper-server stderr]', msg)
    })

    whisperProcess.on('exit', (code) => {
      console.log(`[audio] Whisper server exited with code ${code}`)
      serverReady = false
      whisperProcess = null
    })

    whisperProcess.on('error', (err) => {
      console.error('[audio] Failed to start whisper server:', err.message)
      serverReady = false
      resolve(false)
    })

    // Timeout after 60s (model loading can take a while first time)
    startTimeout = setTimeout(() => {
      console.error('[audio] Whisper server startup timed out')
      resolve(false)
    }, 60000)
  })
}

export function stopWhisperServer(): void {
  if (whisperProcess) {
    whisperProcess.kill()
    whisperProcess = null
    serverReady = false
    console.log('[audio] Whisper server stopped')
  }
}

function isServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${WHISPER_SERVER_URL}/health`, { timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
}

function postAudio(audioBuffer: Buffer, language: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: WHISPER_PORT,
      path: '/transcribe',
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': audioBuffer.length,
        'X-Language': language,
      },
      timeout: 30000,
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) {
            reject(new Error(parsed.error))
          } else {
            resolve(parsed.text || '')
          }
        } catch {
          reject(new Error(`Invalid response: ${data}`))
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.on('timeout', () => { req.destroy(); reject(new Error('Transcription request timed out')) })
    req.write(audioBuffer)
    req.end()
  })
}

export async function transcribeAudioChunk(audioBuffer: Buffer): Promise<TranscriptLine | null> {
  if (!serverReady) {
    console.log('[audio] Whisper server not ready, starting...')
    const started = await startWhisperServer()
    if (!started) {
      console.error('[audio] Could not start whisper server')
      return null
    }
  }

  const language = (store.get('settings.language', 'en') as string)

  try {
    const text = await postAudio(audioBuffer, language)
    if (!text) return null

    return {
      id: `t-${Date.now()}`,
      text,
      timestamp: Date.now(),
      speaker: 'unknown',
    }
  } catch (error) {
    console.error('[audio] Transcription error:', error)
    return null
  }
}

export async function checkWhisperInstalled(): Promise<boolean> {
  // Check if the pipx venv python exists
  const pythonBin = findPython()
  if (pythonBin === 'python3') {
    // Not a known path, try to verify
    return existsSync(path.join(os.homedir(), '.local/bin/whisper'))
  }
  return existsSync(pythonBin)
}
