import type { Dispatch, SetStateAction } from 'react';
import { REQUEST_TYPE_META, getPaymentMethodLabel, type BookingRequestType } from '@/lib/clientDashboard';
import type { ClientPrestataire as Prestataire } from '@/lib/clientDashboardApi';
import { formatCurrency } from '@/lib/formatters';
import { formatAvailability, type RequestFormState } from './clientPrestatairesModel';

export function ClientProviderRequestModal({
  closeRequestModal,
  requestForm,
  selectedPrestataire,
  setRequestForm,
  submitRequest,
}: {
  closeRequestModal: () => void;
  requestForm: RequestFormState;
  selectedPrestataire: Prestataire;
  setRequestForm: Dispatch<SetStateAction<RequestFormState>>;
  submitRequest: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={closeRequestModal}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {REQUEST_TYPE_META[requestForm.requestType].label} avec {selectedPrestataire.name}
            </h3>
            <p className="text-sm text-gray-600">C2P reçoit votre besoin, vérifie le cadre puis assigne le bon prestataire.</p>
          </div>
          <button onClick={closeRequestModal} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100">
            <i className="ri-close-line text-gray-500"></i>
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {(Object.keys(REQUEST_TYPE_META) as BookingRequestType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRequestForm((current) => ({ ...current, requestType: type }))}
              className={`rounded-full px-4 py-2 text-sm font-medium ${requestForm.requestType === type ? REQUEST_TYPE_META[type].color : 'bg-gray-100 text-gray-600'}`}
            >
              <i className={`${REQUEST_TYPE_META[type].icon} mr-2`}></i>
              {REQUEST_TYPE_META[type].label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-gray-600">
            <span>Service</span>
            <select
              value={requestForm.service}
              onChange={(event) => setRequestForm((current) => ({ ...current, service: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            >
              {selectedPrestataire.services.map((service) => <option key={service} value={service}>{service}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-gray-600">
            <span>Mode de paiement souhaité</span>
            <select
              value={requestForm.paymentMethod}
              onChange={(event) => setRequestForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            >
              {selectedPrestataire.paymentMethods.map((method) => <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-gray-600">
            <span>Date souhaitée</span>
            <input
              type="date"
              value={requestForm.date}
              onChange={(event) => setRequestForm((current) => ({ ...current, date: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-gray-600">
            <span>Heure</span>
            <input
              type="time"
              value={requestForm.time}
              onChange={(event) => setRequestForm((current) => ({ ...current, time: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-gray-600 md:col-span-2">
            <span>Adresse / lieu de prestation</span>
            <input
              type="text"
              value={requestForm.address}
              onChange={(event) => setRequestForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Quartier, immeuble, repère..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-gray-600">
            <span>Budget indicatif (FCFA)</span>
            <input
              type="number"
              min="0"
              value={requestForm.budget}
              onChange={(event) => setRequestForm((current) => ({ ...current, budget: event.target.value }))}
              placeholder={selectedPrestataire.pricePerHour ? String(selectedPrestataire.pricePerHour) : 'À discuter'}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            <div className="font-medium text-gray-900">Préférence transmise à C2P</div>
            <div className="mt-1">{selectedPrestataire.name}</div>
            <div>{formatAvailability(selectedPrestataire)}</div>
            <div>{selectedPrestataire.pricePerHour ? `${formatCurrency(selectedPrestataire.pricePerHour)} / heure` : 'Tarif sur devis'}</div>
          </div>
          <label className="space-y-2 text-sm text-gray-600 md:col-span-2">
            <span>Décrivez précisément votre besoin</span>
            <textarea
              value={requestForm.description}
              onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Contexte, urgence, contraintes d’accès, livrables attendus..."
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button onClick={() => void submitRequest()} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700">
            Envoyer à C2P
          </button>
          <button onClick={closeRequestModal} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
