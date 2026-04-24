import { useState, useEffect, useRef, useCallback } from 'react'

const THRESHOLD = 80

export function usePullToRefresh() {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startY = useRef(0)
  const pulling = useRef(false)
  const distanceRef = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      const d = Math.min(delta, THRESHOLD + 20)
      distanceRef.current = d
      setPullDistance(d)
      setIsPulling(true)
      if (delta > 10) e.preventDefault()
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false
    const d = distanceRef.current
    distanceRef.current = 0
    setPullDistance(0)
    setIsPulling(false)
    if (d >= THRESHOLD) {
      setIsRefreshing(true)
      // Clear all SW caches so the reload fetches fresh HTML and assets
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
      window.location.reload()
    }
  }, [])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { isPulling, pullDistance, isRefreshing, threshold: THRESHOLD }
}
