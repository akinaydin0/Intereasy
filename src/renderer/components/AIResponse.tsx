import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AIResponse } from '@shared/types'

interface AIResponsePanelProps {
  response: AIResponse | null
  isGenerating: boolean
  selectedQuestion?: string | null
  onRegenerate?: () => void
}

export default function AIResponsePanel({ response, isGenerating, selectedQuestion, onRegenerate }: AIResponsePanelProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [response?.answer])

  const handleCopy = async () => {
    if (!response?.answer) return
    await navigator.clipboard.writeText(response.answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs p-4">
        <div className="text-center">
          <p className="mb-1">No AI response yet</p>
          <p className="text-[10px] text-gray-700">
            {selectedQuestion
              ? 'Click "Ask AI" to get a response for the selected line'
              : 'Select a transcript line and click "Ask AI"'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="p-3 overflow-y-auto h-full relative">
      {/* Show the question being answered */}
      {selectedQuestion && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider mb-1">Question</p>
          <p className="text-[12px] text-amber-200/90 leading-relaxed">{selectedQuestion}</p>
        </div>
      )}

      {isGenerating && !response.answer && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-blue-400 text-xs">Generating...</span>
        </div>
      )}

      {/* Markdown-rendered response */}
      <div className="ai-response-markdown text-[13px] leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-gray-100 text-base font-bold mb-2 mt-3">{children}</h1>,
            h2: ({ children }) => <h2 className="text-gray-100 text-sm font-bold mb-1.5 mt-2.5">{children}</h2>,
            h3: ({ children }) => <h3 className="text-gray-200 text-[13px] font-semibold mb-1 mt-2">{children}</h3>,
            p: ({ children }) => <p className="text-gray-200 mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="text-gray-300 mb-2 ml-4 space-y-1 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="text-gray-300 mb-2 ml-4 space-y-1 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="text-gray-300">{children}</li>,
            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
            code: ({ children, className }) => {
              const isBlock = className?.includes('language-')
              if (isBlock) {
                return <code className="block bg-gray-800/80 rounded-lg p-3 my-2 text-[12px] font-mono text-green-300 overflow-x-auto">{children}</code>
              }
              return <code className="bg-gray-800/60 text-blue-300 rounded px-1 py-0.5 text-[12px] font-mono">{children}</code>
            },
            pre: ({ children }) => <pre className="mb-2">{children}</pre>,
            a: ({ href, children }) => <a href={href} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">{children}</a>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-600 pl-3 my-2 text-gray-400 italic">{children}</blockquote>,
          }}
        >
          {response.answer}
        </ReactMarkdown>
        {response.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />
        )}
      </div>

      {/* Action buttons — show when response is complete */}
      {response.answer && !response.isStreaming && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-700/30">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>

          {/* Regenerate button */}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" />
                <path d="M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  )
}
