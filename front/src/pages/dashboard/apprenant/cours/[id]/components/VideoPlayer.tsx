import { useEffect, useRef } from 'react';
import type { VideoPlayerProps } from './videoPlayerModel';

export default function VideoPlayer(props: VideoPlayerProps) {
  const { thumbnail, isCompleted, onComplete, src, initialTime = 0, onProgress } = props;
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
    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="max-w-md px-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-slate-400 shadow-sm">
          <i className="ri-video-off-line"></i>
        </div>
        <h3 className="text-base font-bold text-slate-900">Aucune vidéo publiée pour cette leçon</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Dès que le formateur ajoute une vidéo, elle s’affiche ici. Les documents publiés restent disponibles dans les ressources de la leçon.
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          Marquer comme consultée
        </button>
      </div>
    </div>
  );
}
