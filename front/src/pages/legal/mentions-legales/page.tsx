import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function MentionsLegalesPage() {
  return (
    <LegalPageTemplate
      eyebrow="Cadre legal"
      title="Mentions légales"
      intro="Informations d’identification, cadre de publication et moyens de contact du dispositif Centre C2P."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Editeur',
          body: [
            'Le site Centre C2P represente les activités de Groupe C2P Consulting L&M’autour des prestations, de la formation et de l’incubation de projets.',
            'Contact principal : c2psenegal@gmail.com. Contacts complémentaires : senc2p@gmail.com, +221 78 444 43 46, +221 76 744 44 24.',
          ],
        },
        {
          title: 'Adresse',
          body: [
            'Almadies 2 - Villa n 39, Route des Émetteurs, Keur Massar, Senegal.',
            'Les demandes commerciales, administratives et partenariales peuvent être adressées via la page Contact ou les canaux directs affiches sur la plateforme.',
          ],
        },
        {
          title: 'Publication et hébergement',
          body: [
            'Le contenu public, les dashboards et les services reliés au backend sont administres par l’équipe C2P. Les données applicatives sont exploitées via une base Postgres hébergée sur Neon.',
            'L’hébergement applicatif peut évoluer selon l’environnement de production retenu. Toute reproduction substantielle du contenu sans autorisation est interdite.',
          ],
        },
      ]}
    />
  );
}
