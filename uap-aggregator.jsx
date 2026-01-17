import React, { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'uap-videos';
const VOTES_KEY = 'uap-votes';

// Extract video ID and platform from URL
const parseVideoUrl = (url) => {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { platform: 'youtube', id: ytMatch[1] };
  
  // TikTok
  const ttMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
  if (ttMatch) return { platform: 'tiktok', id: ttMatch[1], url };
  
  // Instagram
  const igMatch = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) return { platform: 'instagram', id: igMatch[1] };
  
  return null;
};

// Demo videos for initial state
const demoVideos = [
  {
    id: 'demo-1',
    platform: 'youtube',
    videoId: 'SKsLK_Na7iw',
    title: 'Navy Pilot UFO Encounter - Official Pentagon Release',
    submittedAt: Date.now() - 86400000 * 3,
    realDeal: 847,
    dontBuy: 234,
  },
  {
    id: 'demo-2',
    platform: 'youtube',
    videoId: 'rO_M0hLlJ-Q',
    title: 'GIMBAL UFO - Declassified Navy Footage',
    submittedAt: Date.now() - 86400000 * 7,
    realDeal: 1203,
    dontBuy: 156,
  },
  {
    id: 'demo-3',
    platform: 'youtube',
    videoId: 'VUrTsrhVce4',
    title: 'GO FAST - Official UAP Footage',
    submittedAt: Date.now() - 86400000 * 5,
    realDeal: 956,
    dontBuy: 312,
  },
];

const VideoEmbed = ({ video, isActive }) => {
  if (video.platform === 'youtube') {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${video.videoId}?autoplay=${isActive ? 1 : 0}&mute=1&loop=1&playlist=${video.videoId}&controls=1&modestbranding=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="video-iframe"
      />
    );
  }
  
  if (video.platform === 'tiktok') {
    return (
      <div className="tiktok-placeholder">
        <div className="platform-icon">📱</div>
        <p>TikTok Video</p>
        <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="external-link">
          View on TikTok →
        </a>
      </div>
    );
  }
  
  if (video.platform === 'instagram') {
    return (
      <div className="instagram-placeholder">
        <div className="platform-icon">📷</div>
        <p>Instagram Reel</p>
        <a href={`https://instagram.com/p/${video.videoId}`} target="_blank" rel="noopener noreferrer" className="external-link">
          View on Instagram →
        </a>
      </div>
    );
  }
  
  return null;
};

const VideoCard = ({ video, isActive, onVote, userVote }) => {
  const credibilityScore = video.realDeal + video.dontBuy > 0 
    ? Math.round((video.realDeal / (video.realDeal + video.dontBuy)) * 100) 
    : 50;
  
  const getCredibilityClass = () => {
    if (credibilityScore >= 70) return 'high';
    if (credibilityScore >= 40) return 'medium';
    return 'low';
  };

  return (
    <div className={`video-card ${isActive ? 'active' : ''}`}>
      <div className="video-container">
        <VideoEmbed video={video} isActive={isActive} />
        <div className="video-overlay">
          <div className="credibility-badge" data-level={getCredibilityClass()}>
            <span className="score">{credibilityScore}%</span>
            <span className="label">Credibility</span>
          </div>
        </div>
      </div>
      
      <div className="video-info">
        <h3 className="video-title">{video.title}</h3>
        <div className="video-meta">
          <span className="platform-tag" data-platform={video.platform}>
            {video.platform}
          </span>
          <span className="timestamp">
            {new Date(video.submittedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="voting-section">
        <button 
          className={`vote-btn real-deal ${userVote === 'real' ? 'voted' : ''}`}
          onClick={() => onVote(video.id, 'real')}
          disabled={userVote !== null}
        >
          <span className="vote-icon">👽</span>
          <span className="vote-text">Real Deal</span>
          <span className="vote-count">{video.realDeal.toLocaleString()}</span>
        </button>
        
        <button 
          className={`vote-btn dont-buy ${userVote === 'fake' ? 'voted' : ''}`}
          onClick={() => onVote(video.id, 'fake')}
          disabled={userVote !== null}
        >
          <span className="vote-icon">🛸</span>
          <span className="vote-text">Don't Buy It</span>
          <span className="vote-count">{video.dontBuy.toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
};

const SubmitModal = ({ isOpen, onClose, onSubmit }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      setError('Invalid URL. Please use a YouTube, TikTok, or Instagram video link.');
      return;
    }
    
    if (!title.trim()) {
      setError('Please add a title for this sighting.');
      return;
    }
    
    onSubmit({
      platform: parsed.platform,
      videoId: parsed.id,
      originalUrl: url,
      title: title.trim(),
    });
    
    setUrl('');
    setTitle('');
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
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
            <label>Title / Description</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Strange lights over Phoenix, AZ"
              className="form-input"
            />
          </div>
          
          {error && <div className="form-error">{error}</div>}
          
          <button type="submit" className="submit-btn">
            <span>Upload to Archive</span>
            <span className="btn-glow"></span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default function UAPAggregator() {
  const [videos, setVideos] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('credibility');
  const feedRef = useRef(null);
  
  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const videosResult = await window.storage.get(STORAGE_KEY);
        const votesResult = await window.storage.get(VOTES_KEY);
        
        if (videosResult?.value) {
          setVideos(JSON.parse(videosResult.value));
        } else {
          setVideos(demoVideos);
          await window.storage.set(STORAGE_KEY, JSON.stringify(demoVideos));
        }
        
        if (votesResult?.value) {
          setUserVotes(JSON.parse(votesResult.value));
        }
      } catch (e) {
        // Storage not available, use demo data
        setVideos(demoVideos);
      }
    };
    loadData();
  }, []);
  
  // Save videos to storage when changed
  useEffect(() => {
    if (videos.length > 0) {
      window.storage?.set(STORAGE_KEY, JSON.stringify(videos)).catch(() => {});
    }
  }, [videos]);
  
  // Save votes to storage when changed
  useEffect(() => {
    if (Object.keys(userVotes).length > 0) {
      window.storage?.set(VOTES_KEY, JSON.stringify(userVotes)).catch(() => {});
    }
  }, [userVotes]);
  
  const handleVote = (videoId, voteType) => {
    if (userVotes[videoId]) return;
    
    setUserVotes(prev => ({ ...prev, [videoId]: voteType }));
    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return {
          ...v,
          realDeal: voteType === 'real' ? v.realDeal + 1 : v.realDeal,
          dontBuy: voteType === 'fake' ? v.dontBuy + 1 : v.dontBuy,
        };
      }
      return v;
    }));
  };
  
  const handleSubmit = (videoData) => {
    const newVideo = {
      id: `video-${Date.now()}`,
      ...videoData,
      submittedAt: Date.now(),
      realDeal: 0,
      dontBuy: 0,
    };
    setVideos(prev => [newVideo, ...prev]);
  };
  
  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'credibility') {
      const scoreA = a.realDeal / (a.realDeal + a.dontBuy || 1);
      const scoreB = b.realDeal / (b.realDeal + b.dontBuy || 1);
      return scoreB - scoreA;
    }
    if (sortBy === 'recent') {
      return b.submittedAt - a.submittedAt;
    }
    if (sortBy === 'popular') {
      return (b.realDeal + b.dontBuy) - (a.realDeal + a.dontBuy);
    }
    return 0;
  });
  
  const handleScroll = () => {
    if (!feedRef.current) return;
    const scrollTop = feedRef.current.scrollTop;
    const cardHeight = feedRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };
  
  const scrollToIndex = (index) => {
    if (!feedRef.current) return;
    const cardHeight = feedRef.current.clientHeight;
    feedRef.current.scrollTo({
      top: index * cardHeight,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
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
          
          font-family: 'Space Mono', monospace;
          background: var(--color-bg);
          color: var(--color-text);
          min-height: 100vh;
          overflow: hidden;
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
          background: linear-gradient(180deg, var(--color-bg) 0%, transparent 100%);
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
          position: relative;
          overflow: hidden;
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
          aspect-ratio: 16/9;
          background: var(--color-surface);
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid var(--color-surface-light);
          transition: all 0.3s;
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
        
        .tiktok-placeholder,
        .instagram-placeholder {
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
          position: relative;
          overflow: hidden;
        }
        
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px var(--color-glow);
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
      `}</style>
      
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
                  userVote={userVotes[video.id] || null}
                />
              ))}
            </div>
            
            <div className="navigation-dots">
              {sortedVideos.map((_, index) => (
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
        />
      </div>
    </>
  );
}
