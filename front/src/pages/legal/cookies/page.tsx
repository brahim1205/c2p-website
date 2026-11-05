import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function CookiesPage() {
  return (
    <LegalPageTemplate
      eyebrow="Trace technique"
      title="Politique cookies"
      intro="Le front utilise des mécanismes techniques limits pour maintenir la session, fluidifier la navigation et mémoriser certains choix d’usage."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Cookies techniques',
          body: [
            'Les cookies ou stockages équivalentes peuvent servir a maintenir la session de connexion, protéger les parcours auth et mémoriser des préférences d’interface.',
            'Ces mécanismes sont nécessaires au bon fonctionnement des dashboards, de la navigation rolee et des écrans transactionnels.',
          ],
        },
        {
          title: 'Mesure et sécurité',
          body: [
            'Des éléments de suivi technique peuvent être utilisés pour diagnostiquer des erreurs, vérifier la disponibilité des services et surveiller des anomalies de sécurité.',
            'Ils ne doivent pas être detournes pour un usage incompatible avec les attentes legitimes des utilisateurs.',
          ],
        },
        {
          title: 'Gestion',
          body: [
            'Le navigateur permet de restreindre ou supprimer ces cookies. Une telle action peut toutefois dégrader la connexion, les formulaires proteges et certaines fonctions temps reel.',
            'Les choix de gestion des cookies doivent rester compatibles avec le niveau de service attendu sur les espaces securises.',
          ],
        },
      ]}
    />
  );
}
