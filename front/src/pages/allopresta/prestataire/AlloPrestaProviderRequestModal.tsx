import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReservationFormData } from './providerDetailTypes';

interface AlloPrestaProviderRequestModalProps {
  providerName: string;
  resForm: ReservationFormData;
  visibleServiceOptions: string[];
  onClose: () => void;
  onFieldChange: <K extends keyof ReservationFormData>(field: K, value: ReservationFormData[K]) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function AlloPrestaProviderRequestModal({
  providerName,
  resForm,
  visibleServiceOptions,
  onClose,
  onFieldChange,
  onSubmit,
}: AlloPrestaProviderRequestModalProps) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'contain';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-[#0f172a]/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="allopresta-reservation-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_80px_rgba(15,28,53,0.24)] sm:max-h-[min(720px,calc(100dvh-3rem))]"
      >
        <div className="border-b border-[#e2e8f0] px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1a9a96]">AlloPresta</p>
              <h2 id="allopresta-reservation-title" className="text-2xl font-bold leading-tight text-[#0f1c35] sm:text-3xl">Demande de prestation</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-[#64748b]">
                C2P qualifie votre besoin, vérifie les disponibilités, puis affecte le bon intervenant.
              </p>
            </div>
            <button
              type="button"
              aria-label="Fermer la demande de prestation"
              onClick={onClose}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#e2e8f0] text-[#475569] transition-colors hover:bg-[#f8fafc]"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
            <div className="mb-3 grid gap-3 rounded-2xl border border-[#d6dbe1] bg-[#f8fafc] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold text-[#0f1c35]">{providerName}</p>
                <p className="mt-1 text-xs leading-4 text-[#64748b]">
                  C2P cadre la demande avant toute mise en relation directe.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0f1c35] shadow-sm">
                <i className="ri-shield-check-line text-base text-[#1a9a96]"></i>
                Cadrage C2P
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reservation-service" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Service souhaité
                </label>
                <select
                  id="reservation-service"
                  value={resForm.service || visibleServiceOptions[0] || ''}
                  onChange={(event) => onFieldChange('service', event.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1a9a96] focus:ring-4 focus:ring-[#1a9a96]/10"
                >
                  {visibleServiceOptions.map((service, index) => (
                    <option key={index} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reservation-date" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Date souhaitée
                </label>
                <input
                  id="reservation-date"
                  type="date"
                  required
                  value={resForm.date}
                  onChange={(event) => onFieldChange('date', event.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1a9a96] focus:ring-4 focus:ring-[#1a9a96]/10"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reservation-address" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Adresse de l&apos;intervention
                </label>
                <input
                  id="reservation-address"
                  type="text"
                  required
                  value={resForm.address}
                  onChange={(event) => onFieldChange('address', event.target.value)}
                  placeholder="Ex: Dakar, Almadies"
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1a9a96] focus:ring-4 focus:ring-[#1a9a96]/10"
                />
              </div>

              <div>
                <label htmlFor="reservation-budget" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Budget estimé (FCFA)
                </label>
                <input
                  id="reservation-budget"
                  type="number"
                  required
                  value={resForm.budget}
                  onChange={(event) => onFieldChange('budget', event.target.value)}
                  placeholder="Ex: 50000"
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1a9a96] focus:ring-4 focus:ring-[#1a9a96]/10"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#e2e8f0] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#cbd5e1] px-5 py-2.5 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#f8fafc]">
              Annuler
            </button>
            <button type="submit" className="rounded-xl bg-[#1a9a96] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(26,154,150,0.24)] transition-all hover:bg-[#147f7b]">
              Envoyer à C2P
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
