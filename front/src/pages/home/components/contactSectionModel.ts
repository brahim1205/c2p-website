export type ContactSubmitState = 'idle' | 'loading' | 'success' | 'error';

export type ContactInfoItem = {
  icon: string;
  label: string;
  value: string;
};

export type ContactSocialLink = {
  icon: string;
  label: string;
  href: string;
};

export const contactInfoItems: ContactInfoItem[] = [
  { icon: 'ri-map-pin-line', label: 'Adresse', value: 'Avenue de la République, Dakar, Sénégal' },
  { icon: 'ri-phone-line', label: 'Téléphone', value: '+221 33 XXX XX XX' },
  { icon: 'ri-mail-line', label: 'Email', value: 'contact@c2p.africa' },
  { icon: 'ri-time-line', label: 'Horaires', value: 'Lun - Ven : 8h - 18h' },
];

export const contactSocialLinks: ContactSocialLink[] = [
  { icon: 'ri-whatsapp-line', label: 'WhatsApp', href: 'https://wa.me/221784444346' },
  { icon: 'ri-mail-line', label: 'Email', href: 'mailto:c2psenegal@gmail.com' },
  { icon: 'ri-phone-line', label: 'Telephone', href: 'tel:+221784444346' },
  { icon: 'ri-map-pin-line', label: 'Contact', href: '/contact' },
];

export const contactSubjectOptions = [
  { value: 'general', label: 'Question générale' },
  { value: 'formation', label: 'Formation / Cours' },
  { value: 'prestation', label: 'Service / AlloPresta' },
  { value: 'projet', label: 'Incubation de projet' },
  { value: 'partenariat', label: 'Partenariat' },
];
