import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function CookiesPage() {
  return (
    <LegalPageTemplate
      eyebrow="Trace technique"
      title="Politique cookies"
      intro="Le front utilise des mecanismes techniques limits pour maintenir la session, fluidifier la navigation et memoriser certains choix d usage."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Cookies techniques',
          body: [
            'Les cookies ou stockages equivalentes peuvent servir a maintenir la session de connexion, proteger les parcours auth et memoriser des preferences d interface.',
            'Ces mecanismes sont necessaires au bon fonctionnement des dashboards, de la navigation rolee et des ecrans transactionnels.',
          ],
        },
        {
          title: 'Mesure et securite',
          body: [
            'Des elements de suivi technique peuvent etre utilises pour diagnostiquer des erreurs, verifier la disponibilite des services et surveiller des anomalies de securite.',
            'Ils ne doivent pas etre detournes pour un usage incompatible avec les attentes legitimes des utilisateurs.',
          ],
        },
        {
          title: 'Gestion',
          body: [
            'Le navigateur permet de restreindre ou supprimer ces cookies. Une telle action peut toutefois degrader la connexion, les formulaires proteges et certaines fonctions temps reel.',
            'Les choix de gestion des cookies doivent rester compatibles avec le niveau de service attendu sur les espaces securises.',
          ],
        },
      ]}
    />
  );
}
