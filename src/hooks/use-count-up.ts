import { useState, useEffect } from 'react'

/**
 * Animates a number from 0 to `target` over `duration` ms using requestAnimationFrame.
 * Returns the current animated value.
 */
export function useCountUp(target: number, duration = 400): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }

    const start = performance.now()
    let raf: number

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      setCount(Math.round(progress * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return count
}
