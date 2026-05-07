import LegalPageTemplate from '@/components/feature/LegalPageTemplate';

export default function MentionsLegalesPage() {
  return (
    <LegalPageTemplate
      eyebrow="Cadre legal"
      title="Mentions legales"
      intro="Informations d identification, cadre de publication et moyens de contact du dispositif Centre C2P."
      updatedAt="06 mai 2026"
      sections={[
        {
          title: 'Editeur',
          body: [
            'Le site Centre C2P represente les activites de Groupe C2P Consulting L&M autour des prestations, de la formation et de l incubation de projets.',
            'Contact principal : c2psenegal@gmail.com. Contacts complementaires : senc2p@gmail.com, +221 78 444 43 46, +221 76 744 44 24.',
          ],
        },
        {
          title: 'Adresse',
          body: [
            'Almadies 2 - Villa n 39, Route des Emetteurs, Keur Massar, Senegal.',
            'Les demandes commerciales, administratives et partenariales peuvent etre adressees via la page Contact ou les canaux directs affiches sur la plateforme.',
          ],
        },
        {
          title: 'Publication et hebergement',
          body: [
            'Le contenu public, les dashboards et les services relies au backend sont administres par l equipe C2P. Les donnees applicatives sont exploitees via une base Postgres hebergee sur Neon.',
            'L hebergement applicatif peut evoluer selon l environnement de production retenu. Toute reproduction substantielle du contenu sans autorisation est interdite.',
          ],
        },
      ]}
    />
  );
}
