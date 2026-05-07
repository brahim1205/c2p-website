import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function ConfidentialitePage() {
  return (
    <LegalPageTemplate
      eyebrow="Donnees personnelles"
      title="Politique de confidentialite"
      intro="Cette page precise la collecte minimale, les usages metier et les principes de conservation appliques dans l ecosysteme Centre C2P."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Donnees collecteess',
          body: [
            'Les formulaires d inscription, de connexion, de contact, de commande, de formation et de gestion de projet peuvent enregistrer des informations d identification, de profil, de parcours et de transaction.',
            'Ces donnees sont limitees a ce qui est utile pour fournir les modules AlloPresta, Espace Numerique, ProjectCenter et l administration associee.',
          ],
        },
        {
          title: 'Usages',
          body: [
            'Les informations sont utilisees pour authentifier les utilisateurs, executer les prestations, suivre les formations, gerer les paiements, piloter les projets et maintenir la securite de la plateforme.',
            'Les journaux techniques et traces de securite peuvent etre conserves afin de detecter les abus, reconstituer les incidents et justifier les actions administratives.',
          ],
        },
        {
          title: 'Conservation et droits',
          body: [
            'Les donnees sont conservees selon la duree strictement necessaire au service, aux obligations contractuelles et aux exigences de securite.',
            'Toute demande de mise a jour, de rectification ou de suppression peut etre adressee a l equipe C2P via les canaux de contact officiels.',
          ],
        },
      ]}
    />
  );
}
