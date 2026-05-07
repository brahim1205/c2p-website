import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function CguPage() {
  return (
    <LegalPageTemplate
      eyebrow="Conditions"
      title="Conditions generales d utilisation"
      intro="Les acces publics et prives de Centre C2P sont reserves a un usage professionnel, licite et coherent avec les roles declares sur la plateforme."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Acces et comptes',
          body: [
            'Chaque utilisateur est responsable de l exactitude des informations soumises et de la confidentialite de ses identifiants.',
            'Les acces peuvent etre limites, suspendus ou retires en cas d usage frauduleux, d usurpation, d impayes ou de non respect des regles de la plateforme.',
          ],
        },
        {
          title: 'Services et contenus',
          body: [
            'Les modules AlloPresta, Espace Numerique et ProjectCenter exposent des contenus, services et interactions qui peuvent evoluer selon les besoins operationnels.',
            'Les contenus publies par les utilisateurs doivent rester conformes aux lois applicables, aux droits de tiers et aux exigences de moderation de C2P.',
          ],
        },
        {
          title: 'Paiements et responsabilites',
          body: [
            'Les transactions, factures et remboursements suivent les etats affiches dans les espaces concernes. Les informations visibles dans les dashboards font foi pour le suivi applicatif.',
            'C2P se reserve le droit de suspendre une operation, de demander des justificatifs ou de restreindre un compte lorsqu un risque de securite ou de fraude est detecte.',
          ],
        },
      ]}
    />
  );
}
