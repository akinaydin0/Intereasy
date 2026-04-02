import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'
import http from 'http'
import https from 'https'
import Store from 'electron-store'
import { TranscriptLine, SttProvider } from '../shared/types'

const store = new Store()

const WHISPER_PORT = 8787
const WHISPER_SERVER_URL = `http://127.0.0.1:${WHISPER_PORT}`

// The pipx venv Python that has whisper installed
const PIPX_PYTHON = path.join(os.homedir(), '.local/pipx/venvs/openai-whisper/bin/python3')
const FALLBACK_PYTHONS = [
  path.join(os.homedir(), '.local/pipx/venvs/openai-whisper/bin/python'),
  '/opt/homebrew/bin/python3',
  '/usr/local/bin/python3',
  process.platform === 'win32' ? 'python' : 'python3',
]

let whisperProcess: ChildProcess | null = null
let serverReady = false
// Gate that prevents in-flight audio chunks from restarting the server after Stop
let isAcceptingRequests = false

function findPython(): string {
  if (existsSync(PIPX_PYTHON)) return PIPX_PYTHON;
  for (const p of FALLBACK_PYTHONS) {
    if (p === 'python3' || p === 'python' || existsSync(p)) return p;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
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

export function getSttProvider(): SttProvider {
  return (store.get('settings.sttProvider', 'local') as SttProvider)
}

export async function startWhisperServer(): Promise<boolean> {
  // Cloud mode doesn't need a local server
  if (getSttProvider() === 'cloud-whisper') {
    isAcceptingRequests = true
    return true
  }

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
        isAcceptingRequests = true
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
  // Set gate FIRST so any in-flight transcription requests bail out immediately
  isAcceptingRequests = false
  serverReady = false

  // Cloud mode has no local process to kill
  if (getSttProvider() === 'cloud-whisper') return

  if (whisperProcess) {
    const proc = whisperProcess
    whisperProcess = null
    if (process.platform === 'win32') {
      // On Windows, taskkill is needed to reliably free the port
      const { spawn: spawnSync } = require('child_process')
      spawnSync('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { detached: true, stdio: 'ignore' })
    } else {
      proc.kill('SIGTERM')
    }
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
      timeout: 300000,
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

/**
 * Cloud transcription via OpenAI Whisper API.
 * Sends raw audio as multipart/form-data and returns the transcribed text.
 */
function transcribeViaCloudAPI(audioBuffer: Buffer, language: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const apiKey = store.get('settings.openaiApiKey', '') as string
    if (!apiKey) {
      reject(new Error('No OpenAI API key configured. Add your key in Settings.'))
      return
    }

    // Build multipart/form-data manually (no external deps needed)
    const boundary = `----FormBoundary${Date.now().toString(36)}`
    const CRLF = '\r\n'

    const parts: Buffer[] = []

    // File part
    parts.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="audio.webm"${CRLF}` +
      `Content-Type: audio/webm${CRLF}${CRLF}`
    ))
    parts.push(audioBuffer)
    parts.push(Buffer.from(CRLF))

    // Model part
    parts.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
      `whisper-1${CRLF}`
    ))

    // Language part (skip if auto-detect)
    if (language && language !== 'auto') {
      parts.push(Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="language"${CRLF}${CRLF}` +
        `${language}${CRLF}`
      ))
    }

    // Response format
    parts.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="response_format"${CRLF}${CRLF}` +
      `json${CRLF}`
    ))

    // Closing boundary
    parts.push(Buffer.from(`--${boundary}--${CRLF}`))

    const body = Buffer.concat(parts)

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      timeout: 30000,
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode !== 200) {
            reject(new Error(parsed.error?.message || `OpenAI API error: ${res.statusCode}`))
          } else {
            resolve(parsed.text || '')
          }
        } catch {
          reject(new Error(`Invalid OpenAI response: ${data.slice(0, 200)}`))
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.on('timeout', () => { req.destroy(); reject(new Error('Cloud transcription timed out')) })
    req.write(body)
    req.end()
  })
}

export async function transcribeAudioChunk(audioBuffer: Buffer): Promise<TranscriptLine | null> {
  // If the user stopped listening, reject in-flight chunks — do NOT restart the server
  if (!isAcceptingRequests) {
    console.log('[audio] Not accepting requests (listening stopped), dropping chunk')
    return null
  }

  const provider = getSttProvider()
  const language = (store.get('settings.language', 'en') as string)

  if (provider === 'cloud-whisper') {
    // Cloud mode — send directly to OpenAI API
    try {
      const text = await transcribeViaCloudAPI(audioBuffer, language)
      if (!text) return null

      return {
        id: `t-${Date.now()}`,
        text,
        timestamp: Date.now(),
        speaker: 'unknown',
      }
    } catch (error) {
      console.error('[audio] Cloud transcription error:', error)
      return null
    }
  }

  // Local mode — use local Whisper server
  if (!serverReady) {
    console.log('[audio] Whisper server not ready, starting...')
    const started = await startWhisperServer()
    if (!started) {
      console.error('[audio] Could not start whisper server')
      return null
    }
  }

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
  const pythonBin = findPython()
  try {
    const { execFile } = require('child_process')
    const { promisify } = require('util')
    const execFileAsync = promisify(execFile)
    await execFileAsync(pythonBin, ['-c', 'import whisper'])
    return true
  } catch (error) {
    return false
  }
}
