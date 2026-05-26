import { Link } from 'react-router-dom';

export function ClientBaseDashboard({ firstName }: { firstName: string }) {
  const quickActions = [
    { label: 'Trouver un prestataire', icon: 'ri-search-line', link: '/dashboard/client/prestataires', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Mes réservations', icon: 'ri-calendar-check-line', link: '/dashboard/client/reservations', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Mes commandes', icon: 'ri-shopping-bag-line', link: '/dashboard/client/commandes', tone: 'bg-orange-50 text-orange-700' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', link: '/dashboard/paiements', tone: 'bg-violet-50 text-violet-700' },
  ];

  const distribution = [
    { label: 'Commande', value: 0, color: 'bg-gray-200', width: '0%' },
    { label: 'Devis', value: 1, color: 'bg-orange-400', width: '50%' },
    { label: 'Rendez-vous', value: 1, color: 'bg-sky-500', width: '50%' },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-gray-200 bg-white px-7 py-7 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-600">Espace client / prestataire</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-950">
              Bonjour, {firstName || 'Awa'} <span className="align-middle">👋</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Suivez vos demandes, vos commandes et le traitement C2P sans surcharge d’information.
            </p>
          </div>

          <div className="inline-flex rounded-2xl bg-gray-100 p-1 text-sm font-semibold text-gray-500">
            <button type="button" className="rounded-2xl bg-white px-6 py-3 text-gray-950 shadow-sm">À suivre</button>
            <button type="button" className="rounded-2xl px-6 py-3">7 jours</button>
            <button type="button" className="rounded-2xl px-6 py-3">Ce mois</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white px-7 py-7 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-950">Accès rapide</h2>
          <Link to="/allopresta" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
            Ouvrir le catalogue
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.link}
              className={`min-h-32 rounded-2xl p-5 transition-transform hover:-translate-y-0.5 ${action.tone}`}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <i className={`${action.icon} text-2xl`}></i>
              </div>
              <p className="font-semibold">{action.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_0.6fr]">
        <section className="rounded-3xl border border-gray-200 bg-white px-7 py-7 shadow-sm">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-950">À traiter maintenant</h2>
              <p className="mt-2 text-sm text-gray-500">
                Les éléments qui demandent encore une action de votre part ou un suivi proche.
              </p>
            </div>
            <Link to="/dashboard/client/reservations" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
              Voir tout
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-950">Demandes et rendez-vous</h3>
                <span className="text-sm text-gray-400">2 actif(s)</span>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-bold text-gray-950">Installation electrique</h4>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Devis</span>
                </div>
                <span className="mt-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Analyse C2P</span>
                <p className="mt-4 text-sm text-gray-500">Fatou Ndiaye · 2026-05-17 · 14:00</p>
                <p className="mt-3 text-sm font-semibold text-gray-900">10 000 FCFA</p>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-950">Commandes</h3>
                <span className="text-sm text-gray-400">0 en cours</span>
              </div>
              <div className="rounded-2xl bg-gray-50 px-5 py-6 text-sm text-gray-500">
                Aucune commande sur cette période.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white px-7 py-7 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-950">Répartition</h2>
          <p className="mt-2 text-sm text-gray-500">Vos demandes sur la période sélectionnée.</p>

          <div className="mt-7 space-y-5">
            {distribution.map((item) => (
              <div key={item.label}>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-800">{item.label}</span>
                  <span className="text-gray-500">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
