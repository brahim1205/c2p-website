import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function ConfidentialitePage() {
  return (
    <LegalPageTemplate
      eyebrow="Données personnelles"
      title="Politique de confidentialité"
      intro="Cette page precise la collecte minimale, les usages métier et les principes de conservation appliques dans l’écosystème Centre C2P."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Données collectées',
          body: [
            'Les formulaires d’inscription, de connexion, de contact, de commande, de formation et de gestion de projet peuvent enregistrer des informations d’identification, de profil, de parcours et de transaction.',
            'Ces données sont limitées à ce qui est utile pour fournir les modules AlloPresta, Espace Numérique, ProjectCenter et l’administration associée.',
          ],
        },
        {
          title: 'Usages',
          body: [
            'Les informations sont utilisées pour authentifier les utilisateurs, exécuter les prestations, suivre les formations, gérer les paiements, piloter les projets et maintenir la sécurité de la plateforme.',
            'Les journaux techniques et traces de sécurité peuvent être conservés afin de détecter les abus, reconstituer les incidents et justifier les actions administratives.',
          ],
        },
        {
          title: 'Conservation et droits',
          body: [
            'Les données sont conservées selon la durée strictement nécessaire au service, aux obligations contractuelles et aux exigences de sécurité.',
            'Toute demande de mise à jour, de rectification ou de suppression peut être adressée à l’équipe C2P via les canaux de contact officiels.',
          ],
        },
      ]}
    />
  );
}
