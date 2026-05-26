import { useEffect, useRef, useState } from 'react';
import type { Conversation } from '@/hooks/useBackendMessaging';
import { formatCallDuration } from './messagesPageModel';

type MessageCallControlsArgs = {
  currentConversation: Conversation | undefined;
  success: (title: string, message?: string) => void;
};

export function useMessageCallControls({
  currentConversation,
  success,
}: MessageCallControlsArgs) {
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isInCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isInCall]);

  const handleCall = (type: 'audio' | 'video') => {
    if (!currentConversation) return;
    setCallType(type);
    setIsInCall(true);
    success(
      type === 'video' ? 'Appel vidéo lancé' : 'Appel audio lancé',
      `Appel en cours avec ${currentConversation.name}...`,
    );
  };

  const handleEndCall = () => {
    success('Appel terminé', `Durée de l'appel : ${formatCallDuration(callDuration)}`);
    setIsInCall(false);
    setCallType(null);
  };

  return {
    callDuration,
    callType,
    handleCall,
    handleEndCall,
    isInCall,
  };
}
