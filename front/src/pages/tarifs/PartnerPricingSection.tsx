const partnerBadges = [
  { name: 'Nianthio', price: 2500, description: 'Appui libre à tout projet.' },
  { name: 'Djambars', price: 5000, description: 'Appui de niveau 2, avec suivi et convention.' },
  { name: 'Ndanane', price: 10000, description: 'Niveau 3 et taux de dividendes renforcé selon le placement.' },
];

export default function PartnerPricingSection() {
  return (
    <section id="partenaire-plans" className="text-[#0f1c35]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1a9a96]">Partenaires</p>
      <h3 className="mt-2 text-3xl font-semibold">Partenaires techniques et financiers</h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748b]">
        L’inscription comme partenaire technique est gratuite. Le statut Partenaire Pro vérifié, en partenariat avec C2P
        et éligible à rémunération, est proposé à 5 000 FCFA par mois.
      </p>
      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {partnerBadges.map((badge) => (
          <article key={badge.name} className="rounded-[22px] border border-[#d6dbe1] bg-white p-6">
            <h4 className="text-xl font-semibold">{badge.name}</h4>
            <p className="mt-2 text-3xl font-semibold">{new Intl.NumberFormat('fr-SN').format(badge.price)} FCFA</p>
            <p className="mt-3 text-sm leading-6 text-[#64748b]">{badge.description}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-[#64748b]">
        Cette contribution non remboursable sert de caution solidaire aux projets et participe au fonctionnement du centre d’incubation.
        Un partenaire technique peut également devenir partenaire financier.
      </p>
    </section>
  );
}
