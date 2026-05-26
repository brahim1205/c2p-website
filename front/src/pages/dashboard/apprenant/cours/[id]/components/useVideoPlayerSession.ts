import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { parseDuration, type VideoPlayerProps } from './videoPlayerModel';

type PictureInPictureDocument = Document & {
  pictureInPictureElement?: Element | null;
  exitPictureInPicture?: () => Promise<void>;
};

type PictureInPictureElement = HTMLDivElement & {
  requestPictureInPicture?: () => Promise<void>;
};

export function useVideoPlayerSession({
  duration,
  title,
  onComplete,
  isCompleted,
  initialTime = 0,
  onProgress,
}: VideoPlayerProps) {
  const totalSeconds = parseDuration(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Math.max(0, Math.min(initialTime, totalSeconds)));
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
  }, [playbackSpeed, stopTimer, totalSeconds]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    };
  }, [stopTimer]);

  useEffect(() => {
    setCurrentTime(Math.max(0, Math.min(initialTime, totalSeconds)));
    setIsPlaying(false);
    stopTimer();
  }, [duration, initialTime, stopTimer, title, totalSeconds]);

  useEffect(() => {
    if (currentTime > 0 && currentTime < totalSeconds) {
      onProgress?.(currentTime);
    }
  }, [currentTime, onProgress, totalSeconds]);

  useEffect(() => {
    if (totalSeconds > 0 && currentTime >= totalSeconds && !isCompleted) {
      onComplete();
    }
  }, [currentTime, isCompleted, onComplete, totalSeconds]);

  useEffect(() => {
    if (isPlaying) startTimer();
  }, [isPlaying, playbackSpeed, startTimer]);

  useEffect(() => {
    const handler = () => {
      const pipDocument = document as PictureInPictureDocument;
      setIsFullscreen(!!document.fullscreenElement);
      setIsPiP(!!pipDocument.pictureInPictureElement);
    };
    const pipDocument = document as PictureInPictureDocument;
    document.addEventListener('fullscreenchange', handler);
    pipDocument.addEventListener?.('enterpictureinpicture', handler);
    pipDocument.addEventListener?.('leavepictureinpicture', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      pipDocument.removeEventListener?.('enterpictureinpicture', handler);
      pipDocument.removeEventListener?.('leavepictureinpicture', handler);
    };
  }, []);

  useEffect(() => {
    const handler = (event: globalThis.MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    if (showSpeedMenu) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showSpeedMenu]);

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

  const handleSeek = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
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

  const toggleMute = () => setIsMuted((prev) => !prev);

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseInt(event.target.value, 10);
    setVolume(nextVolume);
    if (nextVolume > 0 && isMuted) setIsMuted(false);
    if (nextVolume === 0) setIsMuted(true);
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

  const togglePiP = async () => {
    try {
      const pipDocument = document as PictureInPictureDocument;
      if (!pipDocument.pictureInPictureElement) {
        await (playerRef.current as PictureInPictureElement | null)?.requestPictureInPicture?.();
        setIsPiP(true);
      } else {
        await pipDocument.exitPictureInPicture?.();
        setIsPiP(false);
      }
    } catch {
      setIsPiP((prev) => !prev);
    }
  };

  const seekToChapter = (time: number) => {
    setCurrentTime(time);
    if (!isPlaying) {
      setIsPlaying(true);
      startTimer();
    }
  };

  return {
    playerRef,
    speedMenuRef,
    totalSeconds,
    isPlaying,
    currentTime,
    showControls,
    volume,
    isMuted,
    showVolumeSlider,
    isFullscreen,
    playbackSpeed,
    showSpeedMenu,
    isFocusMode,
    showChapterMarkers,
    isPiP,
    progressPct: totalSeconds > 0 ? (currentTime / totalSeconds) * 100 : 0,
    isFinished: currentTime >= totalSeconds,
    setPlaybackSpeed,
    setShowSpeedMenu,
    setShowControls,
    setIsFocusMode,
    setShowChapterMarkers,
    setIsPiP,
    togglePlay,
    handleSeek,
    handleMouseMove,
    toggleMute,
    handleVolumeChange,
    handleVolumeMouseEnter,
    handleVolumeMouseLeave,
    toggleFullscreen,
    togglePiP,
    seekToChapter,
  };
}
