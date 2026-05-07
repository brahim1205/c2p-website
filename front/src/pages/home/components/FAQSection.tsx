import { useState, useRef, useEffect } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Comment puis-je m\'inscrire sur C2P ?',
    answer: 'L\'inscription est simple et rapide. Cliquez sur "Créer un compte", remplissez le formulaire avec vos informations personnelles, choisissez votre rôle (apprenant, prestataire, formateur, etc.) et validez votre email. En moins de 2 minutes, vous accédez à tous nos services.'
  },
  {
    question: 'Quels rôles sont disponibles sur la plateforme ?',
    answer: 'C2P propose 7 rôles adaptés à vos besoins : Apprenant pour suivre des formations, Formateur pour dispenser des cours, Prestataire pour proposer des services, Client pour trouver des prestataires, Porteur de projet pour lancer votre entreprise, Partenaire pour collaborer sur des projets, et Admin pour la gestion de la plateforme.'
  },
  {
    question: 'Les formations sont-elles certifiantes ?',
    answer: 'Oui, toutes nos formations délivrent un certificat de réussite reconnu. Vous pouvez consulter vos certificats depuis votre espace apprenant, les partager sur LinkedIn ou les télécharger au format PDF. Le taux de réussite aux examinés est de 98%.'
  },
  {
    question: 'Comment fonctionne AlloPresta ?',
    answer: 'AlloPresta est notre marketplace de services. En tant que client, vous publiez votre besoin et recevez des propositions de prestataires vérifiés. En tant que prestataire, vous créez vos services, définissez vos tarifs et recevez des demandes de clients. Le paiement est sécurisé et libéré après validation du service.'
  },
  {
    question: 'Quel est le coût pour utiliser ProjectCenter ?',
    answer: 'L\'accompagnement de base en incubation est gratuit pour les membres C2P. Nous proposons aussi des packs premium avec mentorat personnalisé, accès aux bureaux et connexions avec des investisseurs. Contactez-nous pour un devis personnalisé selon votre projet.'
  },
  {
    question: 'Puis-je changer de rôle après mon inscription ?',
    answer: 'Oui, votre profil évolue avec vous. Vous pouvez ajouter des rôles secondaires depuis les paramètres de votre compte. Par exemple, un apprenant peut devenir aussi prestataire, ou un formateur peut proposer des services via AlloPresta.'
  },
  {
    question: 'La plateforme est-elle sécurisée pour les paiements ?',
    answer: 'Absolument. Tous les paiements sont sécurisés via des protocoles SSL/TLS. Nous utilisons un système d\'escrow pour AlloPresta : le paiement est réservé jusqu\'à la validation du service par le client. Vos données bancaires ne sont jamais stockées sur nos serveurs.'
  },
];

function AccordionItem({ item, index, isOpen, onToggle, isVisible }: {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  isVisible: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div
        className={`border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 ${
          isOpen ? 'border-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/5' : 'hover:border-gray-300'
        }`}
      >
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-5 lg:p-6 text-left group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                isOpen
                  ? 'bg-[#14B8A6] text-white rotate-0'
                  : 'bg-[#14B8A6]/10 text-[#14B8A6] group-hover:bg-[#14B8A6]/20'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <span className="text-sm font-bold">{String(index + 1).padStart(2, '0')}</span>
              </div>
            </div>
            <span
              className={`font-semibold text-base lg:text-lg transition-colors duration-300 ${
                isOpen ? 'text-[#1a2b4a]' : 'text-gray-700 group-hover:text-[#1a2b4a]'
              }`}
            >
              {item.question}
            </span>
          </div>
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-500 flex-shrink-0 ${
              isOpen
                ? 'bg-[#14B8A6] text-white rotate-180'
                : 'bg-gray-100 text-gray-400 group-hover:bg-[#14B8A6]/10 group-hover:text-[#14B8A6]'
            }`}
          >
            <i className="ri-arrow-down-s-line text-lg"></i>
          </div>
        </button>

        <div
          className="overflow-hidden transition-all duration-500 ease-out"
          style={{ maxHeight: `${height}px`, opacity: isOpen ? 1 : 0 }}
        >
          <div ref={contentRef} className="px-5 lg:px-6 pb-5 lg:pb-6 pl-[72px] lg:pl-[88px]">
            <p className="text-gray-600 text-sm lg:text-base leading-relaxed">{item.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLElement>();

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 px-4 sm:px-6 lg:px-20 bg-[#faf8f3] relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-[#14B8A6]/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-0 w-[300px] h-[300px] bg-[#1a2b4a]/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-3 h-3 bg-[#14B8A6] rotate-45"></div>
            <span className="text-[#1a2b4a] text-sm font-medium uppercase tracking-wider">FAQ</span>
          </div>
          <h2 className="text-[#1a2b4a] font-bold text-2xl sm:text-3xl lg:text-[48px] leading-tight mb-3 sm:mb-4">
            Questions Fréquentes
          </h2>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-2 sm:px-0">
            Tout ce que vous devez savoir pour bien démarrer sur C2P
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              item={faq}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
              isVisible={sectionVisible}
            />
          ))}
        </div>

        {/* CTA */}
        <div className={`mt-12 text-center transition-all duration-1000 delay-700 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-gray-500 text-sm mb-4">
            Vous ne trouvez pas votre réponse ?
          </p>
          <a
            href="mailto:contact@c2p.africa"
            className="group inline-flex items-center gap-2 bg-[#1a2b4a] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#14B8A6] hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-mail-line"></i>
            </div>
            <span>Nous contacter</span>
          </a>
        </div>
      </div>
    </section>
  );
}