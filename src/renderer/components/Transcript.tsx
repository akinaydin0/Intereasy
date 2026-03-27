import React, { useEffect, useRef } from 'react'
import { TranscriptLine } from '@shared/types'

interface TranscriptProps {
  lines: TranscriptLine[]
}

export default function Transcript({ lines }: TranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  if (lines.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">No transcript yet.</p>
        <p className="text-gray-600 text-xs mt-1">Start listening to capture audio.</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      {lines.map((line, i) => {
        const opacity = Math.max(0.4, (i + 1) / lines.length)
        return (
          <div
            key={line.id}
            className="flex gap-2 items-start"
            style={{ opacity }}
          >
            <span className="text-gray-600 text-[10px] font-mono mt-0.5 shrink-0">
              {new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <p className="text-gray-300 text-sm font-mono leading-relaxed">{line.text}</p>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}
