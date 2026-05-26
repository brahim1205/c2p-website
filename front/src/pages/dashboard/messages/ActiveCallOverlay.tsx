import type { Conversation } from '@/hooks/useBackendMessaging';

type ActiveCallOverlayProps = {
  conversation: Conversation;
  callType: 'audio' | 'video';
  callDuration: number;
  onEndCall: () => void;
};

function formatCallDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export default function ActiveCallOverlay({
  conversation,
  callType,
  callDuration,
  onEndCall,
}: ActiveCallOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95">
      <div className="text-center">
        <div className="relative mb-6">
          {conversation.avatar ? (
            <img src={conversation.avatar} alt={conversation.name} className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-white/20" />
          ) : (
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-purple-100">
              <span className="text-2xl font-bold text-purple-600">{conversation.name.split(' ').map((name) => name[0]).join('').substring(0, 2)}</span>
            </div>
          )}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 rounded-full bg-green-500 px-3 py-1 text-xs text-white">
            En ligne
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">{conversation.name}</h2>
        <p className="mb-2 text-gray-400">{callType === 'video' ? 'Appel vidéo en cours...' : 'Appel audio en cours...'}</p>
        <p className="font-mono text-xl text-white">{formatCallDuration(callDuration)}</p>
      </div>
      <div className="mt-12 flex items-center gap-6">
        <button type="button" aria-label="Couper le microphone" className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-white transition-colors hover:bg-gray-600">
          <i className="ri-mic-line text-xl" />
        </button>
        {callType === 'video' && (
          <button type="button" aria-label="Couper la caméra" className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-white transition-colors hover:bg-gray-600">
            <i className="ri-camera-off-line text-xl" />
          </button>
        )}
        <button type="button" aria-label="Activer le haut-parleur" className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-white transition-colors hover:bg-gray-600">
          <i className="ri-volume-up-line text-xl" />
        </button>
        <button
          type="button"
          onClick={onEndCall}
          aria-label="Terminer l'appel"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
        >
          <i className="ri-phone-line text-2xl" />
        </button>
      </div>
    </div>
  );
}
