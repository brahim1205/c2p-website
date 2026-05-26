import { formatTime, VIDEO_SPEED_OPTIONS, type Chapter } from './videoPlayerModel';
import type { useVideoPlayerSession } from './useVideoPlayerSession';
import type { MouseEvent } from 'react';

type VideoPlayerSession = ReturnType<typeof useVideoPlayerSession>;

interface VideoPlayerControlsProps {
  session: VideoPlayerSession;
  chapters?: Chapter[];
  isCompleted: boolean;
  onComplete: () => void;
}

export default function VideoPlayerControls({ session, chapters, isCompleted, onComplete }: VideoPlayerControlsProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 transition-opacity duration-300 md:px-4 md:pb-3 md:pt-8 ${
        session.showControls ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <ChapterMarkers
        chapters={chapters}
        totalSeconds={session.totalSeconds}
        showChapterMarkers={session.showChapterMarkers}
        onSeekToChapter={session.seekToChapter}
      />

      <ProgressBar progressPct={session.progressPct} onSeek={session.handleSeek} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 md:gap-3">
          <button
            onClick={session.togglePlay}
            className="flex h-8 w-8 cursor-pointer items-center justify-center text-white transition-colors hover:text-teal-400"
          >
            <i className={`${session.isFinished ? 'ri-refresh-line' : session.isPlaying ? 'ri-pause-fill' : 'ri-play-fill'} text-base md:text-lg`}></i>
          </button>
          <span className="whitespace-nowrap font-mono text-[10px] text-white/80 md:text-xs">
            {formatTime(session.currentTime)} / {formatTime(session.totalSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-0.5 md:gap-1">
          {!isCompleted ? (
            <button
              onClick={onComplete}
              className="mr-1 cursor-pointer whitespace-nowrap rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-700"
            >
              Marquer terminée
            </button>
          ) : null}

          <SpeedControl session={session} />

          {chapters && chapters.length > 0 ? (
            <button
              onClick={() => session.setShowChapterMarkers((prev) => !prev)}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center transition-colors ${
                session.showChapterMarkers ? 'text-teal-400' : 'text-white/70 hover:text-white'
              }`}
              title={session.showChapterMarkers ? 'Masquer les chapitres' : 'Afficher les chapitres'}
            >
              <i className="ri-list-check-2 text-base md:text-lg"></i>
            </button>
          ) : null}

          <VolumeControl session={session} />

          <button
            onClick={() => session.setIsFocusMode((prev) => !prev)}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center transition-colors ${
              session.isFocusMode ? 'text-teal-400' : 'text-white/70 hover:text-white'
            }`}
            title={session.isFocusMode ? 'Quitter le mode focus' : 'Mode focus'}
          >
            <i className="ri-focus-3-line text-base md:text-lg"></i>
          </button>

          <button
            onClick={session.togglePiP}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center transition-colors ${
              session.isPiP ? 'text-teal-400' : 'text-white/70 hover:text-white'
            }`}
            title={session.isPiP ? 'Quitter Picture-in-Picture' : 'Picture-in-Picture'}
          >
            <i className="ri-picture-in-picture-2-line text-base md:text-lg"></i>
          </button>

          <button
            onClick={session.toggleFullscreen}
            className="flex h-8 w-8 cursor-pointer items-center justify-center text-white/70 transition-colors hover:text-white"
            title={session.isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            <i className={`${session.isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'} text-base md:text-lg`}></i>
          </button>
        </div>
      </div>
    </div>
  );
}

function ChapterMarkers({
  chapters,
  totalSeconds,
  showChapterMarkers,
  onSeekToChapter,
}: {
  chapters?: Chapter[];
  totalSeconds: number;
  showChapterMarkers: boolean;
  onSeekToChapter: (time: number) => void;
}) {
  if (!chapters || chapters.length === 0 || !showChapterMarkers) return null;

  return (
    <div className="relative mb-1 h-4 w-full">
      {chapters.map((chapter, index) => {
        const leftPct = totalSeconds > 0 ? (chapter.time / totalSeconds) * 100 : 0;
        return (
          <button
            key={`${chapter.label}-${index}`}
            onClick={() => onSeekToChapter(chapter.time)}
            className="group/marker absolute top-0 -translate-x-1/2 cursor-pointer"
            style={{ left: `${leftPct}%` }}
            title={chapter.label}
          >
            <div className="h-3 w-1 rounded-full bg-white/60 transition-colors group-hover/marker:bg-teal-400"></div>
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover/marker:opacity-100">
              {chapter.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({ progressPct, onSeek }: { progressPct: number; onSeek: (event: MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div className="mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/20" onClick={onSeek}>
      <div className="relative h-1.5 rounded-full bg-teal-500 transition-all duration-200" style={{ width: `${progressPct}%` }}>
        <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-teal-400 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"></div>
      </div>
    </div>
  );
}

function SpeedControl({ session }: { session: VideoPlayerSession }) {
  return (
    <div className="relative hidden sm:block" ref={session.speedMenuRef}>
      <button
        onClick={() => session.setShowSpeedMenu((prev) => !prev)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center text-[10px] font-bold text-white/70 transition-colors hover:text-white"
        title="Vitesse de lecture"
      >
        {session.playbackSpeed}x
      </button>
      {session.showSpeedMenu ? (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 bg-black/90 shadow-xl backdrop-blur-sm">
          {VIDEO_SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => {
                session.setPlaybackSpeed(speed);
                session.setShowSpeedMenu(false);
              }}
              className={`block w-full cursor-pointer whitespace-nowrap px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                session.playbackSpeed === speed ? 'font-semibold text-teal-400' : 'text-white/80'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VolumeControl({ session }: { session: VideoPlayerSession }) {
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={session.handleVolumeMouseEnter}
      onMouseLeave={session.handleVolumeMouseLeave}
    >
      <button
        onClick={session.toggleMute}
        className="flex h-8 w-8 cursor-pointer items-center justify-center text-white/70 transition-colors hover:text-white"
        title={session.isMuted ? 'Activer le son' : 'Couper le son'}
      >
        <i
          className={`text-base md:text-lg ${
            session.isMuted || session.volume === 0
              ? 'ri-volume-mute-line'
              : session.volume < 50
                ? 'ri-volume-down-line'
                : 'ri-volume-up-line'
          }`}
        ></i>
      </button>
      <div className={`flex items-center overflow-hidden transition-all duration-200 ${session.showVolumeSlider ? 'w-16 opacity-100 md:w-20' : 'w-0 opacity-0'}`}>
        <input
          type="range"
          min="0"
          max="100"
          value={session.isMuted ? 0 : session.volume}
          onChange={session.handleVolumeChange}
          className="mx-2 h-1 w-full cursor-pointer accent-teal-500"
        />
      </div>
    </div>
  );
}
