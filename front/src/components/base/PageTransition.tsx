import { useLocation } from 'react-router-dom';
import { useRef } from 'react';
import { useGsapRouteAnimations } from '@/hooks/useGsapRouteAnimations';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGsapRouteAnimations(rootRef, location.pathname);

  return (
    <div ref={rootRef}>
      {children}
    </div>
  );
}
