export default function ProjectCenterFundingModel() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[30px] border border-[#dce8cf] bg-[#f7fbef] shadow-[0_22px_70px_rgba(15,28,53,0.06)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-[#147f7b] p-6 text-white sm:p-8 lg:p-10">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">Financement solidaire</p>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                Vers la propriété définitive et l’autonomisation.
              </h2>
              <p className="mt-5 text-sm leading-7 text-white/82">
                Les partenaires peuvent simuler leur contribution, suivre l’amortissement et accompagner le porteur jusqu’au remboursement progressif.
              </p>
              <p className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#147f7b]">
                Soumission gratuite pour tous les comptes C2P
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-2 lg:p-8">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8f5d8] text-lg font-black text-[#147f7b]">1</span>
                <h3 className="mt-4 font-black text-[#0f1c35]">Mobilisation</h3>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                Les contributions solidaires volontaires et placements intéressés sont réunis jusqu’à atteindre le financement visé.
              </p>
            </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff4ca] text-lg font-black text-[#8a6500]">2</span>
                <h3 className="mt-4 font-black text-[#0f1c35]">Remboursement progressif</h3>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                Le porteur rembourse progressivement la contribution. Sa part de bénéfices augmente, celle des contributeurs diminue
                au prorata de leur placement, avec recouvrement amorti du capital engagé.
              </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
