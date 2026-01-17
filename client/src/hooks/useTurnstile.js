import { useState, useCallback, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export function useTurnstile() {
  const [token, setToken] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const widgetId = useRef(null)
  const containerRef = useRef(null)

  const render = useCallback((container) => {
    if (!window.turnstile || !container) return

    // Remove existing widget if any
    if (widgetId.current) {
      try {
        window.turnstile.remove(widgetId.current)
      } catch (e) {
        // Widget might already be removed
      }
    }

    containerRef.current = container

    widgetId.current = window.turnstile.render(container, {
      sitekey: SITE_KEY,
      callback: (newToken) => {
        setToken(newToken)
        setIsReady(true)
      },
      'expired-callback': () => {
        setToken(null)
        setIsReady(false)
      },
      'error-callback': () => {
        setToken(null)
        setIsReady(false)
      },
      theme: 'dark',
      size: 'flexible',
    })
  }, [])

  const reset = useCallback(() => {
    setToken(null)
    setIsReady(false)
    if (widgetId.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetId.current)
      } catch (e) {
        // Re-render if reset fails
        if (containerRef.current) {
          render(containerRef.current)
        }
      }
    }
  }, [render])

  const getToken = useCallback(async () => {
    // If we already have a valid token, return it
    if (token) return token

    // Otherwise, render invisible widget and wait for token
    return new Promise((resolve, reject) => {
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'fixed'
      tempContainer.style.bottom = '10px'
      tempContainer.style.right = '10px'
      tempContainer.style.zIndex = '9999'
      document.body.appendChild(tempContainer)

      const cleanup = () => {
        if (tempContainer.parentNode) {
          document.body.removeChild(tempContainer)
        }
      }

      if (!window.turnstile) {
        cleanup()
        reject(new Error('Turnstile not loaded'))
        return
      }

      const id = window.turnstile.render(tempContainer, {
        sitekey: SITE_KEY,
        callback: (newToken) => {
          setToken(newToken)
          cleanup()
          resolve(newToken)
        },
        'error-callback': () => {
          cleanup()
          reject(new Error('Turnstile verification failed'))
        },
        theme: 'dark',
        size: 'compact',
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        cleanup()
        reject(new Error('Turnstile timeout'))
      }, 30000)
    })
  }, [token])

  return { token, isReady, render, reset, getToken }
}
