import React, { useState, useRef, useEffect, useCallback } from 'react'
import { supabase, callFunction } from './lib/supabase'
import { useFingerprint } from './hooks/useFingerprint'
import { useTurnstile } from './hooks/useTurnstile'

// ============================================
// STYLES
// ============================================
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Space Mono', monospace;
  background: #0a0a0f;
  color: #e0e0e0;
  overflow: hidden;
}

.app-container {
  --color-bg: #0a0a0f;
  --color-surface: #12121a;
  --color-surface-light: #1a1a25;
  --color-accent: #00ff88;
  --color-accent-dim: #00ff8830;
  --color-warning: #ff6b35;
  --color-danger: #ff3366;
  --color-text: #e0e0e0;
  --color-text-dim: #808090;
  --color-glow: rgba(0, 255, 136, 0.4);
  
  min-height: 100vh;
  position: relative;
}

.app-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(0, 255, 136, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(255, 51, 102, 0.03) 0%, transparent 50%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 255, 136, 0.02) 2px,
      rgba(0, 255, 136, 0.02) 4px
    );
  pointer-events: none;
  z-index: 0;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg) 60%, transparent 100%);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: var(--color-accent-dim);
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 20px var(--color-glow); }
  50% { box-shadow: 0 0 40px var(--color-glow), 0 0 60px var(--color-accent-dim); }
}

.logo-text {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 24px;
  letter-spacing: 2px;
  background: linear-gradient(90deg, var(--color-accent), #00ccff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 10px;
  color: var(--color-text-dim);
  letter-spacing: 4px;
  text-transform: uppercase;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sort-select {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-light);
  color: var(--color-text);
  padding: 8px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.sort-select:hover {
  border-color: var(--color-accent);
}

.add-btn {
  background: var(--color-accent);
  color: var(--color-bg);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px var(--color-glow);
}

.feed-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  padding-top: 100px;
  scroll-behavior: smooth;
}

.video-card {
  height: 100vh;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 120px 20px 40px;
  position: relative;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  background: var(--color-surface);
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid var(--color-surface-light);
  transition: all 0.3s;
}

.video-container[data-platform="youtube"] {
  aspect-ratio: 16/9;
}

.video-container[data-platform="tiktok"] {
  aspect-ratio: unset;
  max-width: 325px;
  height: auto;
  max-height: 80vh;
}

.video-container[data-platform="instagram"] {
  aspect-ratio: 9/16;
  max-height: 70vh;
}

.video-card.active .video-container {
  border-color: var(--color-accent);
  box-shadow: 0 0 40px var(--color-accent-dim);
}

.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.tiktok-embed-container {
  width: 325px;
  min-height: 575px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.tiktok-embed-container blockquote {
  margin: 0 !important;
}

.tiktok-embed-container section {
  height: auto !important;
}

.platform-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-light) 100%);
}

.platform-icon {
  font-size: 48px;
}

.external-link {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 14px;
  padding: 8px 16px;
  border: 1px solid var(--color-accent);
  border-radius: 20px;
  transition: all 0.2s;
}

.external-link:hover {
  background: var(--color-accent);
  color: var(--color-bg);
}

.video-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.credibility-badge {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid;
}

.credibility-badge[data-level="high"] {
  border-color: var(--color-accent);
  box-shadow: 0 0 20px var(--color-accent-dim);
}

.credibility-badge[data-level="medium"] {
  border-color: var(--color-warning);
}

.credibility-badge[data-level="low"] {
  border-color: var(--color-danger);
}

.credibility-badge .score {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 20px;
}

.credibility-badge[data-level="high"] .score { color: var(--color-accent); }
.credibility-badge[data-level="medium"] .score { color: var(--color-warning); }
.credibility-badge[data-level="low"] .score { color: var(--color-danger); }

.credibility-badge .label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-text-dim);
}

.flag-btn {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid transparent;
  color: var(--color-text-dim);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.flag-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.flag-btn.flagged {
  border-color: var(--color-danger);
  color: var(--color-danger);
  cursor: default;
}

.video-info {
  max-width: 600px;
  width: 100%;
  margin-top: 20px;
  text-align: center;
}

.video-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
  line-height: 1.4;
}

.video-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  align-items: center;
}

.platform-tag {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  padding: 4px 12px;
  border-radius: 4px;
  background: var(--color-surface-light);
}

.platform-tag[data-platform="youtube"] { color: #ff0000; }
.platform-tag[data-platform="tiktok"] { color: #00f2ea; }
.platform-tag[data-platform="instagram"] { color: #e4405f; }

.timestamp {
  color: var(--color-text-dim);
  font-size: 12px;
}

.voting-section {
  display: flex;
  gap: 16px;
  margin-top: 24px;
  max-width: 600px;
  width: 100%;
}

.vote-btn {
  flex: 1;
  background: var(--color-surface);
  border: 2px solid var(--color-surface-light);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
}

.vote-btn:not(:disabled):hover {
  transform: translateY(-4px);
}

.vote-btn.real-deal:not(:disabled):hover {
  border-color: var(--color-accent);
  box-shadow: 0 10px 30px var(--color-accent-dim);
}

.vote-btn.dont-buy:not(:disabled):hover {
  border-color: var(--color-danger);
  box-shadow: 0 10px 30px rgba(255, 51, 102, 0.3);
}

.vote-btn.voted.real-deal {
  background: var(--color-accent-dim);
  border-color: var(--color-accent);
}

.vote-btn.voted.dont-buy {
  background: rgba(255, 51, 102, 0.2);
  border-color: var(--color-danger);
}

.vote-btn:disabled {
  cursor: default;
  opacity: 0.7;
}

.vote-btn.loading {
  opacity: 0.5;
  pointer-events: none;
}

.vote-icon {
  font-size: 32px;
}

.vote-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
}

.vote-count {
  font-size: 14px;
  color: var(--color-text-dim);
}

.navigation-dots {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
}

.nav-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-surface-light);
  border: 2px solid var(--color-surface-light);
  cursor: pointer;
  transition: all 0.3s;
}

.nav-dot.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 10px var(--color-glow);
}

.nav-dot:hover:not(.active) {
  border-color: var(--color-accent);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow: 0 0 60px var(--color-accent-dim);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 28px;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-close:hover {
  color: var(--color-text);
}

.modal-content h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--color-accent);
}

.modal-subtitle {
  color: var(--color-text-dim);
  font-size: 14px;
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-text-dim);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  background: var(--color-bg);
  border: 2px solid var(--color-surface-light);
  border-radius: 8px;
  padding: 14px 16px;
  color: var(--color-text);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 20px var(--color-accent-dim);
}

.form-input::placeholder {
  color: var(--color-text-dim);
}

.form-hint {
  display: block;
  font-size: 11px;
  color: var(--color-text-dim);
  margin-top: 6px;
}

.form-error {
  background: rgba(255, 51, 102, 0.2);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 20px;
}

.turnstile-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--color-accent) 0%, #00ccaa 100%);
  color: var(--color-bg);
  border: none;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px var(--color-glow);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--color-text-dim);
  max-width: 400px;
}

.loading-state {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 3px solid var(--color-surface-light);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-surface-light);
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 300;
  animation: slideUp 0.3s ease;
}

.toast.success {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.toast.error {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 640px) {
  .header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
  
  .logo-text {
    font-size: 18px;
  }
  
  .video-card {
    padding: 100px 16px 30px;
  }
  
  .voting-section {
    flex-direction: column;
    gap: 12px;
  }
  
  .vote-btn {
    flex-direction: row;
    justify-content: center;
    padding: 12px;
  }
  
  .navigation-dots {
    display: none;
  }
}
`

// ============================================
// COMPONENTS
// ============================================

// Remplace la fonction VideoEmbed dans App.jsx par celle-ci :

function VideoEmbed({ video, isActive }) {
  const [tiktokHtml, setTiktokHtml] = useState('')
  const [tiktokError, setTiktokError] = useState(false)
  const containerRef = useRef(null)
  
  useEffect(() => {
    if (video.platform === 'tiktok' && video.original_url) {
      const cleanUrl = video.original_url.split('?')[0]
      
      fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`)
        .then(res => res.json())
        .then(data => {
          // Vérifier que TikTok a retourné de vraies données
          if (data.html && data.author_name && data.author_name !== '@') {
            setTiktokHtml(data.html)
            setTiktokError(false)
          } else {
            // Vidéo non embeddable
            setTiktokError(true)
          }
        })
        .catch(() => {
          setTiktokError(true)
        })
    }
  }, [video.original_url, video.platform])
  
  useEffect(() => {
    if (tiktokHtml && video.platform === 'tiktok') {
      // Supprimer les anciens scripts et recharger
      const oldScripts = document.querySelectorAll('script[src*="tiktok.com/embed"]')
      oldScripts.forEach(s => s.remove())
      
      if (window.tiktokEmbed) {
        delete window.tiktokEmbed
      }
      
      const script = document.createElement('script')
      script.src = 'https://www.tiktok.com/embed.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [tiktokHtml, video.platform])
  
  if (video.platform === 'youtube') {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${video.video_id}?autoplay=${isActive ? 1 : 0}&mute=1&loop=1&playlist=${video.video_id}&controls=1&modestbranding=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="video-iframe"
      />
    )
  }
  
  if (video.platform === 'tiktok') {
    if (tiktokError) {
      const cleanUrl = video.original_url.split('?')[0]
      return (
        <div className="platform-placeholder">
          <div className="platform-icon">📱</div>
          <p>This video cannot be embedded</p>
          <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="external-link">
            Watch on TikTok →
          </a>
        </div>
      )
    }
    
    if (tiktokHtml) {
      return (
        <div 
          ref={containerRef}
          className="tiktok-embed-container"
          dangerouslySetInnerHTML={{ __html: tiktokHtml }}
        />
      )
    }
    
    return (
      <div className="platform-placeholder">
        <div className="platform-icon">📱</div>
        <p>Loading TikTok...</p>
      </div>
    )
  }
  
  if (video.platform === 'instagram') {
    return (
      <div className="platform-placeholder">
        <div className="platform-icon">📷</div>
        <p>Instagram Reel</p>
        <a href={video.original_url} target="_blank" rel="noopener noreferrer" className="external-link">
          View on Instagram →
        </a>
      </div>
    )
  }
  
  return null
}

function VideoCard({ video, isActive, onVote, onFlag, userVote, userFlagged, isVoting }) {
  const totalVotes = video.real_deal_count + video.dont_buy_count
  const credibilityScore = totalVotes > 0 
    ? Math.round((video.real_deal_count / totalVotes) * 100) 
    : 50
  
  const getCredibilityClass = () => {
    if (credibilityScore >= 70) return 'high'
    if (credibilityScore >= 40) return 'medium'
    return 'low'
  }

  return (
    <div className={`video-card ${isActive ? 'active' : ''}`}>
      <div className="video-container" data-platform={video.platform}>
        <VideoEmbed video={video} isActive={isActive} />
        <div className="video-overlay">
          <div className="credibility-badge" data-level={getCredibilityClass()}>
            <span className="score">{credibilityScore}%</span>
            <span className="label">Credibility</span>
          </div>
          <button 
            className={`flag-btn ${userFlagged ? 'flagged' : ''}`}
            onClick={() => !userFlagged && onFlag(video.id)}
            title={userFlagged ? 'Reported' : 'Report inappropriate content'}
            disabled={userFlagged}
          >
            🚩
          </button>
        </div>
      </div>
      
      <div className="video-info">
        <h3 className="video-title">{video.title}</h3>
        <div className="video-meta">
          <span className="platform-tag" data-platform={video.platform}>
            {video.platform}
          </span>
          <span className="timestamp">
            {new Date(video.submitted_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="voting-section">
        <button 
          className={`vote-btn real-deal ${userVote === 'real' ? 'voted' : ''} ${isVoting ? 'loading' : ''}`}
          onClick={() => onVote(video.id, 'real')}
          disabled={userVote !== null || isVoting}
        >
          <span className="vote-icon">👽</span>
          <span className="vote-text">Real Deal</span>
          <span className="vote-count">{video.real_deal_count.toLocaleString()}</span>
        </button>
        
        <button 
          className={`vote-btn dont-buy ${userVote === 'fake' ? 'voted' : ''} ${isVoting ? 'loading' : ''}`}
          onClick={() => onVote(video.id, 'fake')}
          disabled={userVote !== null || isVoting}
        >
          <span className="vote-icon">🛸</span>
          <span className="vote-text">Don't Buy It</span>
          <span className="vote-count">{video.dont_buy_count.toLocaleString()}</span>
        </button>
      </div>
    </div>
  )
}

function SubmitModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const turnstileRef = useRef(null)
  const { token, render, reset } = useTurnstile()
  
  useEffect(() => {
    if (isOpen && turnstileRef.current) {
      render(turnstileRef.current)
    }
  }, [isOpen, render])
  
// Auto-fetch video title
useEffect(() => {
  const fetchTitle = async (videoUrl) => {
    // YouTube
    const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) {
      setFetchingTitle(true)
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`)
        if (response.ok) {
          const data = await response.json()
          setTitle(data.title)
        }
      } catch (e) {}
      finally { setFetchingTitle(false) }
      return
    }
    
    // TikTok
    if (videoUrl.includes('tiktok.com') && videoUrl.includes('/video/')) {
      setFetchingTitle(true)
      try {
        const cleanUrl = videoUrl.split('?')[0]
        const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.title) {
            setTitle(data.title)
          }
        }
      } catch (e) {}
      finally { setFetchingTitle(false) }
      return
    }
  }
  
  if (url.length > 10) {
    fetchTitle(url)
  }
}, [url])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!url.trim()) {
      setError('Please enter a video URL')
      return
    }
    
    if (!title.trim() || title.trim().length < 5) {
      setError('Please add a title (at least 5 characters)')
      return
    }
    
    if (!token) {
      setError('Please complete the verification')
      return
    }
    
    try {
      await onSubmit({ url: url.trim(), title: title.trim(), turnstileToken: token })
      setUrl('')
      setTitle('')
      reset()
      onClose()
    } catch (err) {
      setError(err.message)
      reset()
    }
  }
  
  const handleClose = () => {
    setUrl('')
    setTitle('')
    setError('')
    onClose()
  }
  
  if (!isOpen) return null
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>×</button>
        <h2>Submit UAP Sighting</h2>
        <p className="modal-subtitle">Share footage for the community to analyze</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Video URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="form-input"
            />
            <span className="form-hint">Supports YouTube, TikTok, and Instagram</span>
          </div>
          
          <div className="form-group">
            <label>Title / Description {fetchingTitle && <span style={{color: 'var(--color-accent)'}}>(fetching...)</span>}</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Strange lights over Phoenix, AZ"
              className="form-input"
              maxLength={500}
            />
          </div>
          
          <div className="turnstile-container" ref={turnstileRef}></div>
          
          {error && <div className="form-error">{error}</div>}
          
          <button type="submit" className="submit-btn" disabled={isSubmitting || !token || fetchingTitle}>
            {isSubmitting ? 'Uploading...' : 'Upload to Archive'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])
  
  return (
    <div className={`toast ${type}`}>
      {message}
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [videos, setVideos] = useState([])
  const [userVotes, setUserVotes] = useState({})
  const [userFlags, setUserFlags] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState('credibility')
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  
  const feedRef = useRef(null)
  const { fingerprint, loading: fingerprintLoading } = useFingerprint()
  const { getToken } = useTurnstile()
  
  // Load videos from Supabase
  useEffect(() => {
    async function loadVideos() {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('is_deleted', false)
          .order('submitted_at', { ascending: false })
        
        if (error) throw error
        setVideos(data || [])
      } catch (err) {
        console.error('Error loading videos:', err)
        showToast('Failed to load videos', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadVideos()
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('videos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVideos(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_deleted) {
            setVideos(prev => prev.filter(v => v.id !== payload.new.id))
          } else {
            setVideos(prev => prev.map(v => v.id === payload.new.id ? payload.new : v))
          }
        } else if (payload.eventType === 'DELETE') {
          setVideos(prev => prev.filter(v => v.id !== payload.old.id))
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  // Load user's votes from Supabase
  useEffect(() => {
    if (!fingerprint) return
    
    async function loadUserVotes() {
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('video_id, vote_type')
          .eq('voter_fingerprint', fingerprint)
        
        if (error) throw error
        
        const votes = {}
        data?.forEach(v => { votes[v.video_id] = v.vote_type })
        setUserVotes(votes)
      } catch (err) {
        console.error('Error loading votes:', err)
      }
    }
    
    async function loadUserFlags() {
      try {
        const { data, error } = await supabase
          .from('flags')
          .select('video_id')
          .eq('flagger_fingerprint', fingerprint)
        
        if (error) throw error
        
        const flags = {}
        data?.forEach(f => { flags[f.video_id] = true })
        setUserFlags(flags)
      } catch (err) {
        console.error('Error loading flags:', err)
      }
    }
    
    loadUserVotes()
    loadUserFlags()
  }, [fingerprint])
  
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])
  
  const handleVote = async (videoId, voteType) => {
    if (!fingerprint || userVotes[videoId] || isVoting) return
    
    setIsVoting(true)
    
    try {
      // Get Turnstile token (invisible)
      let turnstileToken = null
      try {
        turnstileToken = await getToken()
      } catch (e) {
        // Continue without token if Turnstile fails
        console.warn('Turnstile failed, continuing without token')
      }
      
      await callFunction('submit-vote', {
        videoId,
        voteType,
        fingerprint,
        turnstileToken,
      })
      
      // Optimistic update
      setUserVotes(prev => ({ ...prev, [videoId]: voteType }))
      setVideos(prev => prev.map(v => {
        if (v.id === videoId) {
          return {
            ...v,
            real_deal_count: voteType === 'real' ? v.real_deal_count + 1 : v.real_deal_count,
            dont_buy_count: voteType === 'fake' ? v.dont_buy_count + 1 : v.dont_buy_count,
          }
        }
        return v
      }))
      
      showToast('Vote recorded!', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsVoting(false)
    }
  }
  
  const handleFlag = async (videoId) => {
    if (!fingerprint || userFlags[videoId]) return
    
    try {
      let turnstileToken = null
      try {
        turnstileToken = await getToken()
      } catch (e) {
        console.warn('Turnstile failed, continuing without token')
      }
      
      await callFunction('flag-video', {
        videoId,
        fingerprint,
        reason: 'inappropriate',
        turnstileToken,
      })
      
      setUserFlags(prev => ({ ...prev, [videoId]: true }))
      showToast('Report submitted. Thank you!', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }
  
  const handleSubmit = async ({ url, title, turnstileToken }) => {
    if (!fingerprint) throw new Error('Please wait, loading...')
    
    setIsSubmitting(true)
    
    try {
      await callFunction('submit-video', {
        url,
        title,
        fingerprint,
        turnstileToken,
      })
      
      showToast('Video submitted successfully!', 'success')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'credibility') {
      const totalA = a.real_deal_count + a.dont_buy_count
      const totalB = b.real_deal_count + b.dont_buy_count
      const scoreA = totalA > 0 ? a.real_deal_count / totalA : 0.5
      const scoreB = totalB > 0 ? b.real_deal_count / totalB : 0.5
      return scoreB - scoreA
    }
    if (sortBy === 'recent') {
      return new Date(b.submitted_at) - new Date(a.submitted_at)
    }
    if (sortBy === 'popular') {
      return (b.real_deal_count + b.dont_buy_count) - (a.real_deal_count + a.dont_buy_count)
    }
    return 0
  })
  
  const handleScroll = () => {
    if (!feedRef.current) return
    const scrollTop = feedRef.current.scrollTop
    const cardHeight = feedRef.current.clientHeight
    const newIndex = Math.round(scrollTop / cardHeight)
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < sortedVideos.length) {
      setCurrentIndex(newIndex)
    }
  }
  
  const scrollToIndex = (index) => {
    if (!feedRef.current) return
    const cardHeight = feedRef.current.clientHeight
    feedRef.current.scrollTo({
      top: index * cardHeight,
      behavior: 'smooth'
    })
  }
  
  if (isLoading || fingerprintLoading) {
    return (
      <>
        <style>{styles}</style>
        <div className="app-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading archive...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app-container">
        <header className="header">
          <div className="logo">
            <div className="logo-icon">👁️</div>
            <div>
              <div className="logo-text">UAP ARCHIVE</div>
              <div className="logo-subtitle">Unexplained Aerial Phenomena</div>
            </div>
          </div>
          
          <div className="header-actions">
            <select 
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="credibility">Most Credible</option>
              <option value="recent">Most Recent</option>
              <option value="popular">Most Voted</option>
            </select>
            
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              + SUBMIT SIGHTING
            </button>
          </div>
        </header>
        
        {sortedVideos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛸</div>
            <h3>No Sightings Yet</h3>
            <p>Be the first to submit unexplained aerial phenomena footage for the community to analyze.</p>
          </div>
        ) : (
          <>
            <div 
              className="feed-container" 
              ref={feedRef}
              onScroll={handleScroll}
            >
              {sortedVideos.map((video, index) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isActive={index === currentIndex}
                  onVote={handleVote}
                  onFlag={handleFlag}
                  userVote={userVotes[video.id] || null}
                  userFlagged={userFlags[video.id] || false}
                  isVoting={isVoting}
                />
              ))}
            </div>
            
            <div className="navigation-dots">
              {sortedVideos.slice(0, 10).map((_, index) => (
                <button
                  key={index}
                  className={`nav-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => scrollToIndex(index)}
                />
              ))}
            </div>
          </>
        )}
        
        <SubmitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
        
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </div>
    </>
  )
}
