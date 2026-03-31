import React, { useState, useEffect } from 'react'
import { AppSettings } from '@shared/types'

interface SettingsProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

export default function Settings({ settings, onSave }: SettingsProps) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [whisperInstalled, setWhisperInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    window.electronAPI.checkWhisper().then(setWhisperInstalled)
  }, [])

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    onSave(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Whisper Status */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
        <div className={`w-2 h-2 rounded-full ${whisperInstalled ? 'bg-green-400' : whisperInstalled === false ? 'bg-red-400' : 'bg-yellow-400'}`} />
        <span className="text-gray-300 text-xs">
          {whisperInstalled === null
            ? 'Checking Whisper...'
            : whisperInstalled
              ? 'Local Whisper installed (free transcription)'
              : 'Whisper not found — run: pip install openai-whisper'}
        </span>
      </div>

      {/* OpenRouter API Key */}
      <div className="space-y-3">
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">OpenRouter API Key</h3>
        <div>
          <input
            type="password"
            value={draft.openRouterApiKey}
            onChange={e => update('openRouterApiKey', e.target.value)}
            placeholder="sk-or-..."
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
          />
          <p className="text-gray-600 text-[10px] mt-1">
            Get your key at openrouter.ai — one key for all models
          </p>
        </div>
      </div>

      {/* AI Model */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">AI Model</h3>
        <select
          value={draft.preferredModel}
          onChange={e => update('preferredModel', e.target.value as AppSettings['preferredModel'])}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6 (recommended)</option>
          <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5</option>
          <option value="anthropic/claude-opus-4-6">Claude Opus 4.6 (highest quality)</option>
          <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (fastest)</option>
        </select>
      </div>

      {/* Whisper Model */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Whisper Model (Local)</h3>
        <select
          value={draft.whisperModel}
          onChange={e => update('whisperModel', e.target.value as AppSettings['whisperModel'])}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="tiny">Tiny (fastest, least accurate)</option>
          <option value="base">Base (recommended — fast + accurate)</option>
          <option value="small">Small (better accuracy, slower)</option>
          <option value="medium">Medium (best accuracy, slowest)</option>
        </select>
      </div>

      {/* Session Mode */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Session Mode</h3>
        <select
          value={draft.sessionMode}
          onChange={e => update('sessionMode', e.target.value as AppSettings['sessionMode'])}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="interview">Job Interview</option>
          <option value="meeting">Meeting</option>
          <option value="sales">Sales Call</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Language</h3>
        <select
          value={draft.language}
          onChange={e => update('language', e.target.value as AppSettings['language'])}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="en">English</option>
          <option value="tr">Turkish</option>
          <option value="auto">Auto-detect</option>
        </select>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
          Overlay Opacity: {Math.round(draft.overlayOpacity * 100)}%
        </h3>
        <input
          type="range"
          min={0.6}
          max={1}
          step={0.05}
          value={draft.overlayOpacity}
          onChange={e => update('overlayOpacity', parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          saved
            ? 'bg-green-500/20 text-green-400'
            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
        }`}
      >
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
