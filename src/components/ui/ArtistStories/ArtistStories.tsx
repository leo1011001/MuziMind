import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaGlobe, FaHeadphones, FaMusic } from 'react-icons/fa';
import './ArtistStories.css';

export interface ArtistSpotlight {
  name: string;
  image: string;
  country: string;
  formedYear: string | number;
  genre: string;
  mood: string;
  style: string;
  website: string;
  bio: string;
  tags: string[];
  listeners: number;
  globalPlays: number;
  lastfmUrl: string;
  aiSummary?: string;
  aiMoodAnalysis?: string;
  aiRelatedFacts?: string[];
  aiGeneratedAt?: string;
}

interface ArtistStoriesProps {
  artists: ArtistSpotlight[];
  startIndex?: number;
  onClose: () => void;
}

const STORY_DURATION = 9000;

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export const ArtistStories: React.FC<ArtistStoriesProps> = ({ artists, startIndex = 0, onClose }) => {
  const [current, setCurrent] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number>(0);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const clickStartRef = useRef<{ x: number; time: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const artist = artists[current];

  const goTo = useCallback((index: number) => {
    if (index < 0) { onClose(); return; }
    if (index >= artists.length) { onClose(); return; }
    setCurrent(index);
    setProgress(0);
    setBioExpanded(false);
    startTimeRef.current = Date.now();
    pausedAtRef.current = 0;
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [artists.length, onClose]);

  const restartCurrent = useCallback(() => {
    setProgress(0);
    setBioExpanded(false);
    startTimeRef.current = Date.now();
    pausedAtRef.current = 0;
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);

  // Progress ticker
  useEffect(() => {
    if (paused) return;
    startTimeRef.current = Date.now() - pausedAtRef.current;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / STORY_DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) goTo(current + 1);
    }, 50);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [current, paused, goTo]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(current + 1);
      if (e.key === 'ArrowLeft') {
        if (current === 0) restartCurrent();
        else goTo(current - 1);
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, goTo, onClose, restartCurrent]);

  // Shared hold timer start (used by both zones and content)
  const startHold = (e: React.PointerEvent) => {
    clickStartRef.current = { x: e.clientX, time: Date.now() };
    isHoldingRef.current = false;
    holdTimeoutRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      pausedAtRef.current = Date.now() - startTimeRef.current;
      setPaused(true);
    }, 150);
  };

  // Shared hold timer release (unpause only, no navigation)
  const endHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      startTimeRef.current = Date.now() - pausedAtRef.current;
      setPaused(false);
      return true; // was holding
    }
    return false; // was not holding
  };

  // Zone pointer events (handles nav + hold)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startHold(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasHolding = endHold();
    if (wasHolding) return;

    if (!clickStartRef.current) return;
    const x = e.clientX;
    const w = (e.currentTarget as HTMLDivElement).offsetWidth;
    if (x < w * 0.35) {
      if (current === 0) restartCurrent();
      else goTo(current - 1);
    } else if (x > w * 0.65) {
      goTo(current + 1);
    }
    clickStartRef.current = null;
  };

  const handlePointerLeave = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      startTimeRef.current = Date.now() - pausedAtRef.current;
      setPaused(false);
    }
  };

  // Content area pointer events — hold detection only, no navigation
  const handleContentPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    startHold(e);
  };

  const handleContentPointerUp = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    endHold();
    clickStartRef.current = null;
  };

  // Scroll handler — when user scrolls back to top, collapse bio (restores buttons)
  const handleContentScroll = useCallback(() => {
    if (contentRef.current && contentRef.current.scrollTop < 10 && bioExpanded) {
      setBioExpanded(false);
    }
  }, [bioExpanded]);

  useEffect(() => {
    return () => { if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current); };
  }, []);

  if (!artist) return null;

  const bioPreview = artist.bio.slice(0, 220);
  const hasBio = artist.bio.length > 0;

  return (
    <div className="stories-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="stories-card">
        {/* Background image */}
        <div
          className="stories-bg"
          style={artist.image ? { backgroundImage: `url(${artist.image})` } : {}}
        >
          {!artist.image && <div className="stories-no-image"><FaMusic /></div>}
        </div>

        {/* Gradient overlays */}
        <div className="stories-gradient-top" />
        <div className="stories-gradient-bottom" />

        {/* Progress bars */}
        <div className="stories-progress-row">
          {artists.map((_, i) => (
            <div key={i} className="stories-progress-track">
              <div
                className="stories-progress-fill"
                style={{
                  width: i < current ? '100%' : i === current ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Top controls */}
        <div className="stories-top-bar">
          <div className="stories-artist-pill">
            <span className="stories-artist-counter">{current + 1} / {artists.length}</span>
            <span className="stories-artist-name-small">{artist.name}</span>
          </div>
          <button className="stories-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {/* Left click zone */}
        <div
          className="stories-zone stories-zone-left"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />

        {/* Right click zone */}
        <div
          className="stories-zone stories-zone-right"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />

        {/* Navigation buttons — blur when bio is expanded */}
        <button
          className={`stories-nav-btn stories-nav-left${bioExpanded ? ' nav-blurred' : ''}`}
          onClick={(e) => { e.stopPropagation(); if (current === 0) restartCurrent(); else goTo(current - 1); }}
          aria-label="Previous"
        >
          <FaChevronLeft />
        </button>
        <button
          className={`stories-nav-btn stories-nav-right${bioExpanded ? ' nav-blurred' : ''}`}
          onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
          aria-label="Next"
        >
          <FaChevronRight />
        </button>

        {/* Content — no title here (shown in top bar), hold detection for pause */}
        <div
          className="stories-content"
          ref={contentRef}
          onClick={e => e.stopPropagation()}
          onPointerDown={handleContentPointerDown}
          onPointerUp={handleContentPointerUp}
          onPointerLeave={handlePointerLeave}
          onScroll={handleContentScroll}
        >
          <div className="stories-meta">
            {artist.country && <span className="stories-meta-chip">📍 {artist.country}</span>}
            {artist.formedYear && <span className="stories-meta-chip">🎸 з. {artist.formedYear}</span>}
            {artist.genre    && <span className="stories-meta-chip">{artist.genre}</span>}
            {artist.mood     && <span className="stories-meta-chip">✨ {artist.mood}</span>}
          </div>

          {artist.listeners > 0 && (
            <div className="stories-stats">
              <span><FaHeadphones /> {formatNumber(artist.listeners)} слушатели</span>
              {artist.globalPlays > 0 && <span><FaMusic /> {formatNumber(artist.globalPlays)} изслушвания</span>}
            </div>
          )}

          {hasBio && (
            <div className="stories-bio">
              <p>{bioExpanded ? artist.bio : bioPreview}{!bioExpanded && artist.bio.length > 220 && '…'}</p>
              {artist.bio.length > 220 && (
                <button
                  className="stories-bio-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !bioExpanded;
                    setBioExpanded(next);
                    if (!next && contentRef.current) {
                      contentRef.current.scrollTop = 0;
                    }
                  }}
                >
                  {bioExpanded ? 'По-малко ▲' : 'Повече ▼'}
                </button>
              )}
            </div>
          )}

          {artist.tags.length > 0 && (
            <div className="stories-tags">
              {artist.tags.map((t, i) => <span key={i} className="stories-tag">{t}</span>)}
            </div>
          )}

          {artist.lastfmUrl && (
            <a
              className="stories-lastfm-link"
              href={artist.lastfmUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
            >
              <FaGlobe /> Last.fm страница
            </a>
          )}

          {artist.aiSummary && (
            <div className="stories-ai-insight">✨ {artist.aiSummary}</div>
          )}
          {artist.aiMoodAnalysis && (
            <div className="stories-ai-mood">🎭 {artist.aiMoodAnalysis}</div>
          )}
          {artist.aiRelatedFacts && artist.aiRelatedFacts.length > 0 && (
            <div className="stories-ai-facts">
              {artist.aiRelatedFacts.map((fact, i) => (
                <span key={i} className="stories-ai-fact">💡 {fact}</span>
              ))}
            </div>
          )}
        </div>

        {artist.aiGeneratedAt && <div className="stories-ai-badge">🤖 AI</div>}
        {paused && <div className="stories-paused-badge">⏸</div>}
      </div>
    </div>
  );
};

export default ArtistStories;
