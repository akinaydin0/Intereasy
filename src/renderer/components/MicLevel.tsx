import React from 'react'

interface MicLevelProps {
  level: number // 0-100
  isListening: boolean
}

export default function MicLevel({ level, isListening }: MicLevelProps) {
  if (!isListening) return null

  const bars = 5
  return (
    <div className="flex items-end gap-[2px] h-3">
      {Array.from({ length: bars }, (_, i) => {
        const threshold = (i + 1) * (100 / bars)
        const isActive = level >= threshold
        const heights = [4, 7, 10, 7, 4] // wave pattern
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ${
              isActive ? 'bg-green-400' : 'bg-gray-600'
            }`}
            style={{ height: `${heights[i]}px` }}
          />
        )
      })}
    </div>
  )
}
