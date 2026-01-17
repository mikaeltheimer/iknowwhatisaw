import { useState, useEffect } from 'react'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load()
        const result = await fp.get()
        setFingerprint(result.visitorId)
      } catch (error) {
        console.error('Fingerprint error:', error)
        // Fallback: generate a random ID stored in localStorage
        let fallbackId = localStorage.getItem('uap_visitor_id')
        if (!fallbackId) {
          fallbackId = 'fallback_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
          localStorage.setItem('uap_visitor_id', fallbackId)
        }
        setFingerprint(fallbackId)
      } finally {
        setLoading(false)
      }
    }

    getFingerprint()
  }, [])

  return { fingerprint, loading }
}
