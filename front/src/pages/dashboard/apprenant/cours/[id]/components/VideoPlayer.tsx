import { useEffect, useRef } from 'react';
import VideoPlayerControls from './VideoPlayerControls';
import { useVideoPlayerSession } from './useVideoPlayerSession';
import type { VideoPlayerProps } from './videoPlayerModel';

export default function VideoPlayer(props: VideoPlayerProps) {
  const { title, thumbnail, chapters, isCompleted, onComplete, src, initialTime = 0, onProgress } = props;
  const session = useVideoPlayerSession(props);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!src || !videoRef.current || initialTime <= 0) return;
    videoRef.current.currentTime = initialTime;
  }, [initialTime, src]);

  if (src) {
    return (
      <div className="overflow-hidden rounded-lg bg-gray-950">
        <video
          ref={videoRef}
          src={src}
          poster={thumbnail || undefined}
          controls
          playsInline
          className="aspect-video w-full bg-black"
          onTimeUpdate={(event) => onProgress?.(event.currentTarget.currentTime)}
          onEnded={() => {
            if (!isCompleted) onComplete();
          }}
        >
          Votre navigateur ne peut pas lire cette vidéo.
        </video>
      </div>
    );
  }

  return (
    <div
      ref={session.playerRef}
      className={`group relative overflow-hidden rounded-lg bg-gray-900 ${
        session.isFullscreen || session.isFocusMode
          ? 'fixed inset-0 z-50 rounded-none'
          : session.isPiP
            ? 'fixed bottom-4 right-4 z-50 h-44 w-80 rounded-lg border border-white/10 shadow-2xl md:h-52 md:w-96'
            : 'aspect-video'
      } ${session.isFocusMode ? 'bg-black' : ''}`}
      onMouseMove={session.handleMouseMove}
      onMouseLeave={() => session.isPlaying && session.setShowControls(false)}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950"></div>
      )}

      {session.isFocusMode ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(95,166,243,0.15)_0%,_transparent_70%)] opacity-30"></div>
        </div>
      ) : null}

      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${session.showControls ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={session.togglePlay}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
        >
          <i className={`text-3xl text-white ${session.isFinished ? 'ri-refresh-line' : session.isPlaying ? 'ri-pause-fill' : 'ri-play-fill'}`}></i>
        </button>
      </div>

      <VideoPlayerControls
        session={session}
        chapters={chapters}
        isCompleted={isCompleted}
        onComplete={onComplete}
      />

      <div className={`absolute left-2 right-2 top-2 transition-opacity duration-300 md:left-4 md:right-4 md:top-4 ${session.showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <p className="max-w-[70%] truncate text-xs font-medium text-white/90 md:text-sm">{title}</p>
          {session.isFocusMode ? (
            <span className="rounded-full bg-teal-600/80 px-2 py-0.5 text-[10px] font-medium text-white">
              Mode Focus
            </span>
          ) : null}
          {session.isPiP ? (
            <button
              onClick={() => session.setIsPiP(false)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              title="Fermer le mode flottant"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
