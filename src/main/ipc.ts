import { ipcMain, BrowserWindow, dialog } from 'electron'
import Store from 'electron-store'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { IPC_CHANNELS, AppSettings, ContextDocument, DocumentChunk, TranscriptLine } from '../shared/types'
import { SYSTEM_PROMPT_INTERVIEW, SYSTEM_PROMPT_MEETING, SYSTEM_PROMPT_SALES } from '../shared/prompts'
import { transcribeAudioChunk, checkWhisperInstalled, startWhisperServer, stopWhisperServer } from './audio'

const store = new Store()
let contextDocuments: ContextDocument[] = []

function chunkText(text: string, maxTokens: number = 500): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let current: string[] = []
  let count = 0

  for (const word of words) {
    current.push(word)
    count++
    if (count >= maxTokens) {
      chunks.push(current.join(' '))
      current = []
      count = 0
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(' '))
  }
  return chunks
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'that', 'this', 'it', 'and', 'or', 'but', 'not', 'so', 'if', 'then', 'than', 'when', 'what', 'which', 'who', 'how', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your'])
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
}

function findRelevantChunks(question: string, maxChunks: number = 3): string[] {
  const questionKeywords = extractKeywords(question)
  if (questionKeywords.length === 0 || contextDocuments.length === 0) return []

  const scored = contextDocuments
    .flatMap(doc => doc.chunks)
    .map(chunk => {
      const overlap = chunk.keywords.filter(k => questionKeywords.includes(k)).length
      return { text: chunk.text, score: overlap }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)

  return scored.map(s => s.text)
}

function getSystemPrompt(mode: string): string {
  switch (mode) {
    case 'meeting': return SYSTEM_PROMPT_MEETING
    case 'sales': return SYSTEM_PROMPT_SALES
    default: return SYSTEM_PROMPT_INTERVIEW
  }
}

async function streamOpenRouterResponse(
  apiKey: string,
  model: string,
  prompt: string,
  overlayWindow: BrowserWindow
): Promise<void> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://interview-ai.local',
      'X-Title': 'Interview AI',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) {
          overlayWindow.webContents.send(IPC_CHANNELS.AI_RESPONSE_CHUNK, content)
        }
      } catch {}
    }
  }
}

export function registerIpcHandlers(overlayWindow: BrowserWindow): void {
  // Check if whisper is installed
  ipcMain.handle('whisper:check', async () => {
    return await checkWhisperInstalled()
  })

  // Start whisper server (called when user clicks Start)
  ipcMain.handle('whisper:start', async () => {
    return await startWhisperServer()
  })

  // Stop whisper server
  ipcMain.handle('whisper:stop', async () => {
    stopWhisperServer()
    return true
  })

  // Audio transcription (local Whisper via persistent server)
  ipcMain.handle(IPC_CHANNELS.AUDIO_CHUNK, async (_event, audioData: ArrayBuffer) => {
    const buffer = Buffer.from(audioData)
    const result = await transcribeAudioChunk(buffer)
    if (result) {
      overlayWindow.webContents.send(IPC_CHANNELS.TRANSCRIPT_UPDATE, result)
    }
    return result
  })

  // AI response generation (OpenRouter)
  ipcMain.handle(IPC_CHANNELS.TRIGGER_AI, async (_event, { transcript, question }: { transcript: TranscriptLine[], question: string }) => {
    const settings = store.get('settings', {}) as Partial<AppSettings>
    const apiKey = settings.openRouterApiKey || ''
    const model = settings.preferredModel || 'anthropic/claude-sonnet-4.6'
    const mode = settings.sessionMode || 'interview'

    if (!apiKey) {
      overlayWindow.webContents.send(IPC_CHANNELS.AI_RESPONSE_START)
      overlayWindow.webContents.send(IPC_CHANNELS.AI_RESPONSE_CHUNK, 'Error: No OpenRouter API key set. Go to Settings to add your key.')
      overlayWindow.webContents.send(IPC_CHANNELS.AI_RESPONSE_END)
      return
    }

    const relevantContext = findRelevantChunks(question)
    const contextStr = relevantContext.length > 0
      ? relevantContext.join('\n\n---\n\n')
      : 'No context documents loaded.'
    const transcriptStr = transcript.map(t => t.text).join('\n')

    const systemPrompt = getSystemPrompt(mode)
      .replace('{CONTEXT}', contextStr)
      .replace('{TRANSCRIPT}', transcriptStr)
      .replace('{QUESTION}', question)

    overlayWindow.webContents.send(IPC_CHANNELS.AI_RESPONSE_START)

    try {
      await streamOpenRouterResponse(apiKey, model, systemPrompt, overlayWindow)
    } catch (error) {
      console.error('AI generation error:', error)
      overlayWindow.webContents.send(IPC_CHANNELS.AI_RESPONSE_CHUNK, `Error: ${(error as Error).message}`)
    }

    overlayWindow.webContents.send(IPC_CHANNELS.AI_RESPONSE_END)
  })

  // Document loading
  ipcMain.handle(IPC_CHANNELS.LOAD_DOCUMENT, async () => {
    const result = await dialog.showOpenDialog(overlayWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const loaded: ContextDocument[] = []

    for (const filePath of result.filePaths) {
      const ext = path.extname(filePath).toLowerCase()
      let content = ''

      try {
        if (ext === '.pdf') {
          const dataBuffer = fs.readFileSync(filePath)
          const pdfData = await pdfParse(dataBuffer)
          content = pdfData.text
        } else if (ext === '.docx') {
          const docBuffer = fs.readFileSync(filePath)
          const docResult = await mammoth.extractRawText({ buffer: docBuffer })
          content = docResult.value
        } else {
          content = fs.readFileSync(filePath, 'utf-8')
        }
      } catch (err) {
        console.error(`Failed to parse ${filePath}:`, err)
        continue
      }

      const textChunks = chunkText(content)
      const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const chunks: DocumentChunk[] = textChunks.map((text, i) => ({
        text,
        keywords: extractKeywords(text),
        chunkIndex: i,
        documentId: docId,
      }))

      const doc: ContextDocument = {
        id: docId,
        name: path.basename(filePath),
        content,
        chunks,
        uploadedAt: Date.now(),
      }

      contextDocuments.push(doc)
      loaded.push(doc)
    }

    return loaded.map(d => ({ id: d.id, name: d.name, uploadedAt: d.uploadedAt, chunkCount: d.chunks.length }))
  })

  // Clear context
  ipcMain.handle(IPC_CHANNELS.CLEAR_CONTEXT, () => {
    contextDocuments = []
    return true
  })

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return store.get('settings', {
      openRouterApiKey: '',
      preferredModel: 'anthropic/claude-sonnet-4.6',
      whisperModel: 'base',
      overlayPosition: { x: 0, y: 0, width: 420, height: 600 },
      overlayOpacity: 0.85,
      sessionMode: 'interview',
      language: 'en',
      autoDetectQuestions: true,
      questionSilenceThreshold: 1500,
    })
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, settings: AppSettings) => {
    store.set('settings', settings)
    return true
  })

  // Toggle overlay
  ipcMain.handle(IPC_CHANNELS.TOGGLE_OVERLAY, () => {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide()
    } else {
      overlayWindow.show()
    }
  })
}
