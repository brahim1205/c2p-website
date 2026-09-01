import { Navigate, useParams } from 'react-router-dom';

export default function FormationPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = String(id ?? '').trim();

  return (
    <Navigate
      to={`/paiement?type=formation&course=${encodeURIComponent(courseId)}&returnTo=${encodeURIComponent(`/espace-numerique/formation/${courseId}`)}`}
      replace
    />
  );
}
