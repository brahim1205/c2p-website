export default function ProjectCenterFundingModel() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[28px] border border-[#d6dbe1] bg-[#f8fafc] p-6 sm:p-8">
          <p className="c2p-eyebrow">Financement solidaire</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0f1c35]">Vers la propriété définitive et l’autonomisation</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5">
              <h3 className="font-semibold text-[#0f1c35]">1. Mobilisation</h3>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                Les contributions solidaires volontaires et placements intéressés sont réunis jusqu’à atteindre le financement visé.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <h3 className="font-semibold text-[#0f1c35]">2. Remboursement progressif</h3>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                Le porteur rembourse progressivement la contribution. Sa part de bénéfices augmente, celle des contributeurs diminue
                au prorata de leur placement, avec recouvrement amorti du capital engagé.
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm font-medium text-[#1a9a96]">
            La soumission d’un projet est gratuite pour tous les comptes C2P.
          </p>
        </div>
      </div>
    </section>
  );
}
