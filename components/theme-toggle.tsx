'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'
  const actionLabel = isDark ? '切换到浅色模式' : '切换到深色模式'

  return (
    <div className="fixed top-4 right-4 z-[70]">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={actionLabel}
        title={actionLabel}
        className="h-10 w-10 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/70 dark:border-slate-700/70 shadow-md hover:shadow-lg"
      >
        {mounted ? (
          isDark ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )
        ) : (
          <span className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
