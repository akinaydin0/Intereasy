import { execFile } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs'
import path from 'path'
import os from 'os'
import Store from 'electron-store'
import { TranscriptLine } from '../shared/types'

const store = new Store()

// Electron doesn't inherit shell PATH, so check common install locations
const WHISPER_PATHS = [
  'whisper',
  path.join(os.homedir(), '.local/bin/whisper'),
  '/usr/local/bin/whisper',
  '/opt/homebrew/bin/whisper',
]

let resolvedWhisperPath: string | null = null

function findWhisperBinary(): Promise<string | null> {
  if (resolvedWhisperPath) return Promise.resolve(resolvedWhisperPath)

  return new Promise((resolve) => {
    let checked = 0
    for (const wp of WHISPER_PATHS) {
      execFile(wp, ['--help'], (error) => {
        checked++
        if (!error && !resolvedWhisperPath) {
          resolvedWhisperPath = wp
          resolve(wp)
        } else if (checked === WHISPER_PATHS.length && !resolvedWhisperPath) {
          resolve(null)
        }
      })
    }
  })
}

function getTempPath(ext: string): string {
  return path.join(os.tmpdir(), `interview-ai-${Date.now()}.${ext}`)
}

export async function transcribeAudioChunk(audioBuffer: Buffer): Promise<TranscriptLine | null> {
  const whisperModel = (store.get('settings.whisperModel', 'base') as string)
  const language = (store.get('settings.language', 'en') as string)

  // Write audio chunk to temp file
  const audioPath = getTempPath('webm')
  const outputPath = getTempPath('txt')
  const outputDir = path.dirname(outputPath)
  const outputName = path.basename(outputPath, '.txt')

  writeFileSync(audioPath, audioBuffer)

  try {
    const text = await new Promise<string>((resolve, reject) => {
      const args = [
        audioPath,
        '--model', whisperModel,
        '--output_format', 'txt',
        '--output_dir', outputDir,
        // Whisper names output based on input filename
        '--fp16', 'False',
      ]

      // Add language if not auto-detect
      if (language !== 'auto') {
        args.push('--language', language)
      }

      const whisperBin = resolvedWhisperPath || 'whisper'
      execFile(whisperBin, args, { timeout: 60000 }, (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`Whisper error: ${stderr || error.message}`))
          return
        }

        // Whisper outputs to <input_filename>.txt in output_dir
        const whisperOutput = path.join(outputDir, path.basename(audioPath, '.webm') + '.txt')
        if (existsSync(whisperOutput)) {
          const result = readFileSync(whisperOutput, 'utf-8').trim()
          // Clean up whisper output file
          try { unlinkSync(whisperOutput) } catch {}
          resolve(result)
        } else {
          resolve('')
        }
      })
    })

    if (!text) return null

    return {
      id: `t-${Date.now()}`,
      text,
      timestamp: Date.now(),
      speaker: 'unknown',
    }
  } catch (error) {
    console.error('Local Whisper transcription error:', error)
    return null
  } finally {
    // Clean up temp audio file
    try { unlinkSync(audioPath) } catch {}
  }
}

export async function checkWhisperInstalled(): Promise<boolean> {
  const binary = await findWhisperBinary()
  return binary !== null
}
