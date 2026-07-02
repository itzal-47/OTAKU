import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, X, SkipForward, SkipBack, Volume2, VolumeX, Music } from 'lucide-react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  anime?: string | null;
  audio_url?: string | null;
  youtube_url?: string | null;
}

interface PlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Track[];
  play: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  toggle: (track: Track) => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function MiniPlayer({ track, isPlaying, currentTime, duration, volume, onToggle, onStop, onSeek, onVolume, onNext, onPrev, hasNext, hasPrev }:
  { track: Track; isPlaying: boolean; currentTime: number; duration: number; volume: number;
    onToggle: () => void; onStop: () => void; onSeek: (t: number) => void; onVolume: (v: number) => void;
    onNext: () => void; onPrev: () => void; hasNext: boolean; hasPrev: boolean; }) {
  const [muted, setMuted] = useState(false);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return createPortal(
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 md:left-auto md:right-4 md:w-80 z-50 px-3 md:px-0">
      <div className="bg-bg2 border border-border rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md" style={{ boxShadow: '0 8px 32px rgba(139,92,246,0.15)' }}>
        {/* Progress bar */}
        <div className="h-1 bg-bg3 cursor-pointer" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * duration); }}>
          <div className="h-full bg-gradient-to-r from-purple to-purple2 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple/30 to-teal/30 flex items-center justify-center flex-shrink-0">
            <Music size={15} className="text-purple2" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text truncate">{track.title}</p>
            <p className="text-[10px] text-text3 truncate">{track.artist}{track.anime ? ` · ${track.anime}` : ''}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-text3 hidden sm:block">{formatTime(currentTime)}/{formatTime(duration)}</span>
            <button onClick={onPrev} disabled={!hasPrev} className="w-7 h-7 flex items-center justify-center text-text3 hover:text-text disabled:opacity-30"><SkipBack size={13} /></button>
            <button onClick={onToggle} className="w-8 h-8 rounded-full bg-purple flex items-center justify-center text-white">
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>
            <button onClick={onNext} disabled={!hasNext} className="w-7 h-7 flex items-center justify-center text-text3 hover:text-text disabled:opacity-30"><SkipForward size={13} /></button>
            <button onClick={() => setMuted(m => !m)} className="w-7 h-7 flex items-center justify-center text-text3 hover:text-text hidden sm:flex">
              {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <button onClick={onStop} className="w-7 h-7 flex items-center justify-center text-text3 hover:text-red"><X size={14} /></button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = volume;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => { setIsPlaying(false); skipNext(); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    return () => { audio.pause(); audio.src = ''; audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onMeta); audio.removeEventListener('ended', onEnded); };
  }, []);

  const play = useCallback((track: Track, newQueue?: Track[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!track.audio_url) return; // sem áudio directo
    audio.pause();
    audio.src = track.audio_url;
    audio.load();
    audio.play().catch(() => {});
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    if (newQueue) { setQueue(newQueue); setQueueIndex(newQueue.findIndex(t => t.id === track.id)); }
  }, []);

  const pause = useCallback(() => { audioRef.current?.pause(); setIsPlaying(false); }, []);
  const resume = useCallback(() => { audioRef.current?.play().catch(() => {}); setIsPlaying(true); }, []);
  const stop = useCallback(() => { audioRef.current?.pause(); if (audioRef.current) { audioRef.current.src = ''; audioRef.current.currentTime = 0; } setCurrentTrack(null); setIsPlaying(false); setCurrentTime(0); setDuration(0); }, []);
  const seek = useCallback((t: number) => { if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); } }, []);
  const setVol = useCallback((v: number) => { if (audioRef.current) audioRef.current.volume = v; setVolume(v); }, []);

  const toggle = useCallback((track: Track) => {
    if (!track.audio_url) return;
    if (currentTrack?.id === track.id) { isPlaying ? pause() : resume(); }
    else play(track);
  }, [currentTrack, isPlaying, pause, resume, play]);

  const skipNext = useCallback(() => {
    const next = queue[queueIndex + 1];
    if (next) { setQueueIndex(i => i + 1); play(next, queue); }
  }, [queue, queueIndex, play]);

  const skipPrev = useCallback(() => {
    const prev = queue[queueIndex - 1];
    if (prev) { setQueueIndex(i => i - 1); play(prev, queue); }
    else if (audioRef.current) { audioRef.current.currentTime = 0; setCurrentTime(0); }
  }, [queue, queueIndex, play]);

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, currentTime, duration, volume, queue, play, pause, resume, toggle, stop, seek, setVolume: setVol, skipNext, skipPrev }}>
      {children}
      {currentTrack && currentTrack.audio_url && (
        <MiniPlayer
          track={currentTrack} isPlaying={isPlaying} currentTime={currentTime} duration={duration} volume={volume}
          onToggle={() => isPlaying ? pause() : resume()} onStop={stop} onSeek={seek} onVolume={setVol}
          onNext={skipNext} onPrev={skipPrev}
          hasNext={queueIndex < queue.length - 1} hasPrev={queueIndex > 0}
        />
      )}
    </PlayerContext.Provider>
  );
}
