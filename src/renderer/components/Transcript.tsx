import React, { useEffect, useRef, useState } from 'react'
import { TranscriptLine } from '@shared/types'

interface TranscriptProps {
  lines: TranscriptLine[]
  selectedLineId: string | null
  onSelectLine: (id: string) => void
}

export default function Transcript({ lines, selectedLineId, onSelectLine }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)

  // Smart auto-scroll: only auto-scroll if user is at the bottom
  useEffect(() => {
    if (!userScrolled && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [lines, userScrolled])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40
    setUserScrolled(!isAtBottom)
  }

  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs p-4">
        <div className="text-center">
          <p className="mb-1">No transcript yet</p>
          <p className="text-[10px] text-gray-700">Click Start and speak to begin</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto p-2 space-y-1"
    >
      {lines.map((line) => {
        const isSelected = line.id === selectedLineId
        const isQuestion = line.isQuestion

        return (
          <div
            key={line.id}
            onClick={() => onSelectLine(line.id)}
            className={`
              group relative cursor-pointer rounded-lg px-3 py-2 transition-all duration-150
              border-l-2
              ${isSelected
                ? 'border-l-blue-400 bg-blue-500/15'
                : isQuestion
                  ? 'border-l-amber-400/70 bg-amber-500/5 hover:bg-amber-500/10'
                  : 'border-l-transparent hover:bg-gray-800/40'
              }
            `}
          >
            {/* Timestamp + badges */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] text-gray-600 font-mono">
                {new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {isQuestion && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                  ?
                </span>
              )}
              {isSelected && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                  selected
                </span>
              )}
            </div>

            {/* Text */}
            <p className={`text-[13px] leading-relaxed ${
              isSelected ? 'text-gray-100' : 'text-gray-300'
            }`}>
              {line.text}
            </p>
          </div>
        )
      })}

      {/* Scroll-to-bottom indicator */}
      {userScrolled && (
        <button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
              setUserScrolled(false)
            }
          }}
          className="sticky bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gray-700/80 text-gray-300 text-[10px] hover:bg-gray-600/80 transition-colors"
        >
          Scroll to latest
        </button>
      )}
    </div>
  )
}
