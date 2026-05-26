import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchItem {
  id: string;
  label: string;
  category: string;
  path: string;
  icon: string;
}

const searchIndex: Record<string, SearchItem[]> = {
  apprenant: [
    { id: 'cours-1', label: 'Marketing Digital Avancé', category: 'Formation', path: '/dashboard/apprenant/cours/1', icon: 'ri-book-open-line' },
    { id: 'cours-2', label: 'Développement Web React', category: 'Formation', path: '/dashboard/apprenant/cours/2', icon: 'ri-book-open-line' },
    { id: 'cours-3', label: 'Comptabilité pour PME', category: 'Formation', path: '/dashboard/apprenant/cours/3', icon: 'ri-book-open-line' },
    { id: 'cours-4', label: 'Design UI/UX Fondamentaux', category: 'Formation', path: '/dashboard/apprenant/cours/4', icon: 'ri-book-open-line' },
    { id: 'cours-5', label: 'Gestion de Projet Agile', category: 'Formation', path: '/dashboard/apprenant/cours/5', icon: 'ri-book-open-line' },
    { id: 'cours-6', label: 'Analyse de Données avec Python', category: 'Formation', path: '/dashboard/apprenant/cours/6', icon: 'ri-book-open-line' },
    { id: 'prog', label: 'Ma progression', category: 'Page', path: '/dashboard/apprenant/progression', icon: 'ri-bar-chart-grouped-line' },
    { id: 'cert', label: 'Mes certificats', category: 'Page', path: '/dashboard/apprenant/certificats', icon: 'ri-award-line' },
  ],
  client: [
    { id: 'prest-1', label: 'Moussa Diallo — Plomberie', category: 'Prestataire', path: '/allopresta/prestataire/1', icon: 'ri-user-line' },
    { id: 'prest-2', label: 'Fatou Ndiaye — Électricité', category: 'Prestataire', path: '/allopresta/prestataire/2', icon: 'ri-user-line' },
    { id: 'prest-6', label: 'Mame Thiam — Informatique', category: 'Prestataire', path: '/allopresta/prestataire/6', icon: 'ri-user-line' },
    { id: 'res', label: 'Mes réservations', category: 'Page', path: '/dashboard/client/reservations', icon: 'ri-calendar-check-line' },
    { id: 'cmd', label: 'Mes commandes', category: 'Page', path: '/dashboard/client/commandes', icon: 'ri-shopping-bag-line' },
    { id: 'find', label: 'Trouver un prestataire', category: 'Page', path: '/dashboard/client/prestataires', icon: 'ri-search-line' },
  ],
  prestataire: [
    { id: 'svc', label: 'Mes services', category: 'Page', path: '/dashboard/prestataire/services', icon: 'ri-briefcase-line' },
    { id: 'dem', label: 'Demandes reçues', category: 'Page', path: '/dashboard/prestataire/demandes', icon: 'ri-inbox-line' },
    { id: 'avi', label: 'Avis clients', category: 'Page', path: '/dashboard/prestataire/avis', icon: 'ri-star-line' },
    { id: 'pay', label: 'Mes paiements', category: 'Page', path: '/dashboard/paiements', icon: 'ri-wallet-3-line' },
  ],
  formateur: [
    { id: 'cours', label: 'Mes formations', category: 'Page', path: '/dashboard/formateur/mes-cours', icon: 'ri-book-open-line' },
    { id: 'classe', label: 'Classes virtuelles', category: 'Page', path: '/dashboard/formateur/classes-virtuelles', icon: 'ri-video-line' },
    { id: 'appren', label: 'Mes apprenants', category: 'Page', path: '/dashboard/formateur/apprenants', icon: 'ri-group-line' },
    { id: 'eval', label: 'Évaluations', category: 'Page', path: '/dashboard/formateur/evaluations', icon: 'ri-file-list-3-line' },
    { id: 'certif', label: 'Certificats', category: 'Page', path: '/dashboard/formateur/certificats', icon: 'ri-award-line' },
  ],
  porteur: [
    { id: 'proj', label: 'Mes projets', category: 'Page', path: '/dashboard/porteur/mes-projets', icon: 'ri-folder-line' },
    { id: 'part', label: 'Partenariats', category: 'Page', path: '/dashboard/porteur/partenariats', icon: 'ri-team-line' },
    { id: 'fin', label: 'Financements', category: 'Page', path: '/dashboard/porteur/financements', icon: 'ri-funds-line' },
    { id: 'soum', label: 'Soumettre un projet', category: 'Page', path: '/dashboard/porteur/mes-projets/soumettre', icon: 'ri-add-circle-line' },
  ],
  partenaire: [
    { id: 'opp', label: 'Opportunités', category: 'Page', path: '/dashboard/partenaire/opportunites', icon: 'ri-search-line' },
    { id: 'suiv', label: 'Projets suivis', category: 'Page', path: '/dashboard/partenaire/projets-suivis', icon: 'ri-eye-line' },
    { id: 'coll', label: 'Collaborations', category: 'Page', path: '/dashboard/partenaire/collaborations', icon: 'ri-team-line' },
    { id: 'inv', label: 'Mes investissements', category: 'Page', path: '/dashboard/paiements', icon: 'ri-wallet-3-line' },
  ],
  admin: [
    { id: 'users', label: 'Utilisateurs', category: 'Page', path: '/admin/users', icon: 'ri-user-line' },
    { id: 'content', label: 'Contenus', category: 'Page', path: '/admin/content', icon: 'ri-file-list-line' },
    { id: 'accred', label: 'Accréditations', category: 'Page', path: '/admin/accreditations', icon: 'ri-shield-check-line' },
    { id: 'paym', label: 'Paiements', category: 'Page', path: '/admin/payments', icon: 'ri-money-dollar-circle-line' },
    { id: 'reports', label: 'Signalements', category: 'Page', path: '/admin/reports', icon: 'ri-flag-line' },
    { id: 'analytics', label: 'Analytics', category: 'Page', path: '/admin/analytics', icon: 'ri-bar-chart-line' },
    { id: 'sec', label: 'Sécurité', category: 'Page', path: '/admin/security', icon: 'ri-shield-check-line' },
  ],
};

interface GlobalSearchProps {
  context: string;
  variant?: 'block' | 'inline';
  placeholder?: string;
}

export default function GlobalSearch({
  context,
  variant = 'block',
  placeholder = 'Rechercher une page, une formation, un prestataire...',
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const items = searchIndex[context] ?? [];
  const filtered = query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()) || i.category.toLowerCase().includes(query.toLowerCase()))
    : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSelect = (item: SearchItem) => {
    navigate(item.path);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex]);
    }
  };

  return (
    <>
      {/* Search trigger bar */}
      {variant === 'block' ? (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <button
            onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="w-full flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <div className="flex h-5 w-5 items-center justify-center">
              <i className="ri-search-line text-gray-400"></i>
            </div>
            <span className="flex-1 text-sm text-gray-400">{placeholder}</span>
            <span className="hidden items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 sm:flex">
              <kbd className="font-sans">Ctrl</kbd>
              <span>+</span>
              <kbd className="font-sans">K</kbd>
            </span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-teal-200 hover:bg-gray-50 cursor-pointer"
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <i className="ri-search-line text-gray-400"></i>
          </div>
          <span className="flex-1 truncate text-sm text-gray-400">{placeholder}</span>
          <span className="hidden items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 lg:flex">
            <kbd className="font-sans">Ctrl</kbd>
            <span>+</span>
            <kbd className="font-sans">K</kbd>
          </span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setIsOpen(false); setQuery(''); }}></div>
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez pour rechercher..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
              />
              <button
                onClick={() => { setIsOpen(false); setQuery(''); }}
                className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 hover:bg-gray-200"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {query.trim() && filtered.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="ri-search-line text-xl text-gray-400"></i>
                  </div>
                  <p className="text-sm text-gray-600">Aucun résultat pour &quot;{query}&quot;</p>
                </div>
              )}
              {filtered.length > 0 && (
                <div className="py-2">
                  {filtered.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                        idx === selectedIndex ? 'bg-teal-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg flex-shrink-0">
                        <i className={`${item.icon} text-gray-600 text-sm`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                      <i className="ri-arrow-right-line text-gray-400 text-sm"></i>
                    </button>
                  ))}
                </div>
              )}
              {!query.trim() && (
                <div className="p-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Suggestions</p>
                  <div className="grid grid-cols-1 gap-1">
                    {items.slice(0, 5).map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
                      >
                        <div className="w-6 h-6 flex items-center justify-center">
                          <i className={`${item.icon} text-gray-500 text-sm`}></i>
                        </div>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
