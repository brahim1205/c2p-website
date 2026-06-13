export const inputClass = 'c2p-input block px-4 py-3 text-sm';

export type RoleProfileData = {
  publicTitle: string;
  location: string;
  bio: string;
  skills: string;
  website: string;
  preferredLanguage: string;
  partnerType: string;
  partnerBadge: string;
};

type RoleProfileField = {
  key: keyof RoleProfileData;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: 'text' | 'url' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  hint?: string;
};

export const userTypes = [
  { id: 'client', title: 'Client', description: 'Rechercher des prestations, publier un besoin et suivre vos demandes', icon: 'ri-user-line' },
  { id: 'prestataire', title: 'Prestataire', description: 'Proposer vos services professionnels', icon: 'ri-briefcase-line' },
  { id: 'formateur', title: 'Formateur', description: 'Creer et dispenser des formations', icon: 'ri-presentation-line' },
  { id: 'apprenant', title: 'Apprenant', description: 'Suivre des formations et developper vos competences', icon: 'ri-graduation-cap-line' },
  { id: 'porteur', title: 'Porteur de projet', description: 'Soumettre et developper votre projet', icon: 'ri-lightbulb-line' },
  { id: 'partenaire', title: 'Partenaire', description: 'Intervenir comme partenaire financier ou technique', icon: 'ri-hand-heart-line' },
];

export const roleProfileFields: Record<string, { title: string; description: string; fields: RoleProfileField[] }> = {
  client: {
    title: 'Localisation',
    description: '',
    fields: [{ key: 'location', label: 'Localisation', placeholder: 'Ex: Dakar, Senegal', required: true }],
  },
  prestataire: {
    title: 'Profil professionnel',
    description: 'Ces informations preparent votre profil public et vos futures demandes d accreditation.',
    fields: [
      { key: 'publicTitle', label: 'Metier principal', placeholder: 'Ex: Electricien batiment', required: true },
      { key: 'location', label: 'Zone d intervention', placeholder: 'Ex: Dakar, Thies, Rufisque', required: true },
      {
        key: 'skills',
        label: 'Services proposes',
        placeholder: 'Installation electrique, depannage, maintenance',
        required: true,
        hint: 'Separez les services par des virgules.',
      },
      { key: 'bio', label: 'Experience', placeholder: 'Resumez votre experience, vos certifications ou votre specialite.', type: 'textarea' },
    ],
  },
  formateur: {
    title: 'Profil formateur',
    description: 'Ces informations servent a presenter votre expertise dans l espace numerique.',
    fields: [
      { key: 'publicTitle', label: 'Titre professionnel', placeholder: 'Ex: Formatrice marketing digital', required: true },
      { key: 'skills', label: 'Domaines enseignes', placeholder: 'Marketing digital, React, gestion de projet', required: true, hint: 'Separez les domaines par des virgules.' },
      { key: 'preferredLanguage', label: 'Langue principale', placeholder: 'Ex: Francais, Wolof, Anglais' },
      { key: 'bio', label: 'Presentation', placeholder: 'Presentez votre approche pedagogique et votre experience.', type: 'textarea' },
    ],
  },
  apprenant: {
    title: 'Objectif d apprentissage',
    description: 'On adapte votre espace aux formations que vous voulez suivre.',
    fields: [],
  },
  porteur: {
    title: 'Projet a accompagner',
    description: 'Ces informations aident C2P a comprendre rapidement votre projet.',
    fields: [],
  },
  partenaire: {
    title: 'Profil partenaire',
    description: 'On identifie votre type d accompagnement pour les porteurs de projet.',
    fields: [
      {
        key: 'partnerType',
        label: 'Type de partenaire',
        placeholder: 'Choisir un type',
        required: true,
        type: 'select',
        options: [
          { value: 'technique', label: 'Partenaire technique' },
          { value: 'financier', label: 'Partenaire financier' },
          { value: 'technique_financier', label: 'Partenaire technique et financier' },
        ],
      },
      {
        key: 'partnerBadge',
        label: 'Badge financier souhaité',
        placeholder: 'Facultatif pour un partenaire technique',
        type: 'select',
        options: [
          { value: '', label: 'Aucun badge financier' },
          { value: 'nianthio', label: 'Nianthio — 2 500 FCFA' },
          { value: 'djambars', label: 'Djambars — 5 000 FCFA' },
          { value: 'ndanane', label: 'Ndanane — 10 000 FCFA' },
        ],
        hint: 'Contribution non remboursable servant de caution solidaire et au fonctionnement du centre.',
      },
      { key: 'publicTitle', label: 'Organisation ou fonction', placeholder: 'Ex: Mentor produit, partenaire financier', required: true },
      { key: 'skills', label: 'Expertises', placeholder: 'Financement, mentorat, technique, distribution', required: true, hint: 'Separez les expertises par des virgules.' },
      { key: 'website', label: 'Site ou page publique', placeholder: 'https://...', type: 'url' },
      { key: 'bio', label: 'Type d accompagnement', placeholder: 'Expliquez comment vous pouvez accompagner les projets.', type: 'textarea' },
    ],
  },
};

export const emptyRoleProfile: RoleProfileData = {
  publicTitle: '',
  location: '',
  bio: '',
  skills: '',
  website: '',
  preferredLanguage: '',
  partnerType: '',
  partnerBadge: '',
};

export const inlineRoleProfileSections = new Set(['client', 'apprenant', 'porteur']);

export function splitCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
