import { useState, useEffect, useRef, useCallback } from 'react';

function parseDuration(d: string): number {
  let total = 0;
  const hMatch = d.match(/(\d+)\s*h/);
  const mMatch = d.match(/(\d+)\s*min/);
  const sMatch = d.match(/(\d+)\s*s/);
  if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) total += parseInt(mMatch[1], 10) * 60;
  if (sMatch) total += parseInt(sMatch[1], 10);
  if (total === 0) {
    const num = parseInt(d, 10);
    if (!isNaN(num)) total = num * 60;
  }
  return total || 300;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Chapter {
  time: number;
  label: string;
}

interface Props {
  duration: string;
  title: string;
  onComplete: () => void;
  isCompleted: boolean;
  chapters?: Chapter[];
  thumbnail?: string;
}

export default function VideoPlayer({
  duration,
  title,
  onComplete,
  isCompleted,
  chapters,
  thumbnail,
}: Props) {
  const totalSeconds = parseDuration(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showChapterMarkers, setShowChapterMarkers] = useState(true);
  const [isPiP, setIsPiP] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + playbackSpeed;
        if (next >= totalSeconds) {
          stopTimer();
          setIsPlaying(false);
          return totalSeconds;
        }
        return next;
      });
    }, 1000);
  }, [totalSeconds, stopTimer, playbackSpeed]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    };
  }, [stopTimer]);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    stopTimer();
  }, [title, duration, stopTimer]);

  useEffect(() => {
    if (isPlaying) startTimer();
  }, [playbackSpeed, isPlaying, startTimer]);

  const togglePlay = () => {
    if (currentTime >= totalSeconds) {
      setCurrentTime(0);
      setIsPlaying(true);
      startTimer();
      return;
    }
    if (isPlaying) {
      setIsPlaying(false);
      stopTimer();
    } else {
      setIsPlaying(true);
      startTimer();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = Math.floor(pct * totalSeconds);
    setCurrentTime(newTime);
    if (isPlaying) startTimer();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const progressPct = totalSeconds > 0 ? (currentTime / totalSeconds) * 100 : 0;
  const isFinished = currentTime >= totalSeconds;

  const toggleMute = () => setIsMuted((prev) => !prev);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
    if (val === 0) setIsMuted(true);
  };

  const handleVolumeMouseEnter = () => {
    setShowVolumeSlider(true);
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
  };

  const handleVolumeMouseLeave = () => {
    volumeTimerRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 800);
  };

  const toggleFullscreen = async () => {
    if (!playerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await playerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  const toggleFocusMode = () => setIsFocusMode((prev) => !prev);

  const togglePiP = async () => {
    try {
      if (!document.pictureInPictureElement) {
        await (playerRef.current as any)?.requestPictureInPicture?.();
        setIsPiP(true);
      } else {
        await (document as any).exitPictureInPicture?.();
        setIsPiP(false);
      }
    } catch {
      setIsPiP((prev) => !prev);
    }
  };

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setIsPiP(!!(document as any).pictureInPictureElement);
    };
    document.addEventListener('fullscreenchange', handler);
    (document as any).addEventListener?.('enterpictureinpicture', handler);
    (document as any).addEventListener?.('leavepictureinpicture', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      (document as any).removeEventListener?.('enterpictureinpicture', handler);
      (document as any).removeEventListener?.('leavepictureinpicture', handler);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    if (showSpeedMenu) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showSpeedMenu]);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const seekToChapter = (time: number) => {
    setCurrentTime(time);
    if (!isPlaying) {
      setIsPlaying(true);
      startTimer();
    }
  };

  return (
    <div
      ref={playerRef}
      className={`relative bg-gray-900 rounded-lg overflow-hidden group ${
        isFullscreen || isFocusMode
          ? 'fixed inset-0 z-50 rounded-none'
          : isPiP
            ? 'fixed bottom-4 right-4 z-50 w-80 h-44 rounded-lg shadow-2xl border border-white/10 md:w-96 md:h-52'
            : 'aspect-video'
      } ${isFocusMode ? 'bg-black' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Background image or gradient */}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950"></div>
      )}

      {isFocusMode && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_rgba(95,166,243,0.15)_0%,_transparent_70%)]"></div>
        </div>
      )}

      {/* Center play/pause button */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={togglePlay}
          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
        >
          <i
            className={`text-3xl text-white ${
              isFinished ? 'ri-refresh-line' : isPlaying ? 'ri-pause-fill' : 'ri-play-fill'
            }`}
          ></i>
        </button>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 md:px-4 pb-2 md:pb-3 pt-6 md:pt-8 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Chapter markers */}
        {chapters && chapters.length > 0 && showChapterMarkers && (
          <div className="relative w-full h-4 mb-1">
            {chapters.map((ch, idx) => {
              const leftPct = totalSeconds > 0 ? (ch.time / totalSeconds) * 100 : 0;
              return (
                <button
                  key={idx}
                  onClick={() => seekToChapter(ch.time)}
                  className="absolute top-0 -translate-x-1/2 group/marker cursor-pointer"
                  style={{ left: `${leftPct}%` }}
                  title={ch.label}
                >
                  <div className="w-1 h-3 bg-white/60 rounded-full group-hover/marker:bg-teal-400 transition-colors"></div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {ch.label}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Progress bar */}
        <div
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3"
          onClick={handleSeek}
        >
          <div
            className="bg-teal-500 h-1.5 rounded-full transition-all duration-200 relative"
            style={{ width: `${progressPct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-teal-400 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center text-white hover:text-teal-400 transition-colors cursor-pointer"
            >
              <i
                className={`${
                  isFinished ? 'ri-refresh-line' : isPlaying ? 'ri-pause-fill' : 'ri-play-fill'
                } text-base md:text-lg`}
              ></i>
            </button>
            <span className="text-[10px] md:text-xs text-white/80 font-mono whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(totalSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-0.5 md:gap-1">
            {!isCompleted && (
              <button
                onClick={onComplete}
                className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer mr-1"
              >
                Marquer terminée
              </button>
            )}

            {/* Speed */}
            <div className="relative hidden sm:block" ref={speedMenuRef}>
              <button
                onClick={() => setShowSpeedMenu((prev) => !prev)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer text-[10px] font-bold"
                title="Vitesse de lecture"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl border border-white/10">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`block w-full px-3 py-1.5 text-xs text-left whitespace-nowrap hover:bg-white/10 transition-colors cursor-pointer ${
                        playbackSpeed === speed ? 'text-teal-400 font-semibold' : 'text-white/80'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chapters toggle */}
            {chapters && chapters.length > 0 && (
              <button
                onClick={() => setShowChapterMarkers((prev) => !prev)}
                className={`w-8 h-8 flex items-center justify-center transition-colors cursor-pointer ${
                  showChapterMarkers ? 'text-teal-400' : 'text-white/70 hover:text-white'
                }`}
                title={showChapterMarkers ? 'Masquer les chapitres' : 'Afficher les chapitres'}
              >
                <i className="ri-list-check-2 text-base md:text-lg"></i>
              </button>
            )}

            {/* Volume */}
            <div
              className="relative flex items-center"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <button
                onClick={toggleMute}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                <i
                  className={`text-base md:text-lg ${
                    isMuted || volume === 0
                      ? 'ri-volume-mute-line'
                      : volume < 50
                        ? 'ri-volume-down-line'
                        : 'ri-volume-up-line'
                  }`}
                ></i>
              </button>
              <div
                className={`flex items-center overflow-hidden transition-all duration-200 ${
                  showVolumeSlider ? 'w-16 md:w-20 opacity-100' : 'w-0 opacity-0'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 mx-2 accent-teal-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Focus */}
            <button
              onClick={toggleFocusMode}
              className={`w-8 h-8 flex items-center justify-center transition-colors cursor-pointer ${
                isFocusMode ? 'text-teal-400' : 'text-white/70 hover:text-white'
              }`}
              title={isFocusMode ? 'Quitter le mode focus' : 'Mode focus'}
            >
              <i className="ri-focus-3-line text-base md:text-lg"></i>
            </button>

            {/* PiP */}
            <button
              onClick={togglePiP}
              className={`w-8 h-8 flex items-center justify-center transition-colors cursor-pointer ${
                isPiP ? 'text-teal-400' : 'text-white/70 hover:text-white'
              }`}
              title={isPiP ? 'Quitter Picture-in-Picture' : 'Picture-in-Picture'}
            >
              <i className="ri-picture-in-picture-2-line text-base md:text-lg"></i>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              <i
                className={`text-base md:text-lg ${
                  isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'
                }`}
              ></i>
            </button>
          </div>
        </div>
      </div>

      {/* Top title bar */}
      <div
        className={`absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs md:text-sm font-medium text-white/90 truncate max-w-[70%]">{title}</p>
          {isFocusMode && (
            <span className="px-2 py-0.5 bg-teal-600/80 text-white text-[10px] font-medium rounded-full">
              Mode Focus
            </span>
          )}
          {isPiP && (
            <button
              onClick={() => setIsPiP(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Fermer le mode flottant"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}