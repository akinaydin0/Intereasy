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
    if (draft.sttProvider === 'local') {
      window.electronAPI.checkWhisper().then(setWhisperInstalled)
    }
  }, [draft.sttProvider])

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    onSave(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isCloud = draft.sttProvider === 'cloud-whisper'

  return (
    <div className="p-4 space-y-4 settings-enter">
      {/* STT Provider Toggle */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Speech-to-Text Provider
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => update('sttProvider', 'local')}
            className={`relative px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
              !isCloud
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10 shadow-lg'
                : 'bg-gray-800/40 border-gray-700/30 text-gray-500 hover:border-gray-600/50 hover:text-gray-400'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-[13px]">🖥️</span>
              <span>Local Whisper</span>
              <span className={`text-[9px] ${!isCloud ? 'text-emerald-500/70' : 'text-gray-600'}`}>Free • Needs Python</span>
            </div>
            {!isCloud && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
          <button
            onClick={() => update('sttProvider', 'cloud-whisper')}
            className={`relative px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
              isCloud
                ? 'bg-violet-500/15 border-violet-500/40 text-violet-400 shadow-violet-500/10 shadow-lg'
                : 'bg-gray-800/40 border-gray-700/30 text-gray-500 hover:border-gray-600/50 hover:text-gray-400'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-[13px]">☁️</span>
              <span>OpenAI API</span>
              <span className={`text-[9px] ${isCloud ? 'text-violet-500/70' : 'text-gray-600'}`}>Fast • ~$0.006/min</span>
            </div>
            {isCloud && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-400" />
            )}
          </button>
        </div>
      </div>

      {/* Whisper Status — local only */}
      {!isCloud && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-800/40 border border-gray-700/20">
          <div className={`w-2 h-2 rounded-full ${whisperInstalled ? 'bg-emerald-400 pulse-glow' : whisperInstalled === false ? 'bg-red-400' : 'bg-amber-400'}`} />
          <span className="text-gray-300 text-xs">
            {whisperInstalled === null
              ? 'Checking Whisper...'
              : whisperInstalled
                ? 'Local Whisper installed ✓'
                : 'Whisper not found — run: pip install openai-whisper'}
          </span>
        </div>
      )}

      {/* OpenAI API Key — cloud only */}
      {isCloud && (
        <div className="space-y-2">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">OpenAI API Key</h3>
          <div>
            <input
              type="password"
              value={draft.openaiApiKey}
              onChange={e => update('openaiApiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            <p className="text-gray-600 text-[10px] mt-1.5">
              Get your key at <span className="text-violet-400/80">platform.openai.com</span> → API Keys
            </p>
          </div>
        </div>
      )}

      {/* OpenRouter API Key */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">OpenRouter API Key</h3>
        <div>
          <input
            type="password"
            value={draft.openRouterApiKey}
            onChange={e => update('openRouterApiKey', e.target.value)}
            placeholder="sk-or-..."
            className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
          <p className="text-gray-600 text-[10px] mt-1.5">
            Get your key at <span className="text-blue-400/80">openrouter.ai</span> — one key for all AI models
          </p>
        </div>
      </div>

      {/* AI Model */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">AI Model</h3>
        <select
          value={draft.preferredModel}
          onChange={e => update('preferredModel', e.target.value as AppSettings['preferredModel'])}
          className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-all"
        >
          <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6 (recommended)</option>
          <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5</option>
          <option value="anthropic/claude-opus-4-6">Claude Opus 4.6 (highest quality)</option>
          <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (fastest)</option>
        </select>
      </div>

      {/* Whisper Model — local only */}
      {!isCloud && (
        <div className="space-y-2">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Whisper Model (Local)</h3>
          <select
            value={draft.whisperModel}
            onChange={e => update('whisperModel', e.target.value as AppSettings['whisperModel'])}
            className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-all"
          >
            <option value="tiny">Tiny (fastest, least accurate)</option>
            <option value="base">Base (recommended — fast + accurate)</option>
            <option value="small">Small (better accuracy, slower)</option>
            <option value="medium">Medium (best accuracy, slowest)</option>
          </select>
        </div>
      )}

      {/* Session Mode */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Session Mode</h3>
        <select
          value={draft.sessionMode}
          onChange={e => update('sessionMode', e.target.value as AppSettings['sessionMode'])}
          className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-all"
        >
          <option value="interview">Job Interview</option>
          <option value="meeting">Meeting</option>
          <option value="sales">Sales Call</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Language</h3>
        <select
          value={draft.language}
          onChange={e => update('language', e.target.value as AppSettings['language'])}
          className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-all"
        >
          <option value="en">English</option>
          <option value="tr">Turkish</option>
          <option value="auto">Auto-detect</option>
        </select>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
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
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-blue-400 border border-blue-500/30 hover:from-blue-500/30 hover:to-violet-500/30 hover:shadow-lg hover:shadow-blue-500/10'
        }`}
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
