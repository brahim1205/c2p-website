import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function CguPage() {
  return (
    <LegalPageTemplate
      eyebrow="Conditions"
      title="Conditions générales d’utilisation"
      intro="Les accès publics et privés de Centre C2P sont réservés à un usage professionnel, licite et coherent avec les rôles declares sur la plateforme."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Accès et comptes',
          body: [
            'Chaque utilisateur est responsable de l’exactitude des informations soumises et de la confidentialité de ses identifiants.',
            'Les accès peuvent être limites, suspendus ou retires en cas d’usage frauduleux, d’usurpation, d’impayés ou de non respect des règles de la plateforme.',
          ],
        },
        {
          title: 'Services et contenus',
          body: [
            'Les modules AlloPresta, Espace Numérique et ProjectCenter exposent des contenus, services et interactions qui peuvent évoluer selon les besoins opérationnels.',
            'Les contenus publiés par les utilisateurs doivent rester conformes aux lois applicables, aux droits de tiers et aux exigences de modération de C2P.',
          ],
        },
        {
          title: 'Paiements et responsabilités',
          body: [
            'Les transactions, factures et remboursements suivent les états affiches dans les espaces concernes. Les informations visibles dans les dashboards font foi pour le suivi applicatif.',
            'C2P se réservé le droit de suspendre une opération, de demander des justificatifs ou de restreindre un compte lorsqu un risque de sécurité ou de fraude est détecté.',
          ],
        },
      ]}
    />
  );
}
