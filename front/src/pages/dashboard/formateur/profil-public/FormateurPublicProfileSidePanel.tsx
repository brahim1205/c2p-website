import type { PaymentSettings } from '@/lib/roles';
import {
  getFieldClass,
  type ProfileFormState,
} from './formateurPublicProfileModel';

interface FormateurPublicProfileSidePanelProps {
  form: ProfileFormState;
  onPaymentSettingChange: (field: keyof PaymentSettings, value: string) => void;
}

export default function FormateurPublicProfileSidePanel({
  form,
  onPaymentSettingChange,
}: FormateurPublicProfileSidePanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Informations de paiement</h2>
        <div className="space-y-4">
          <input value={form.paymentSettings.beneficiaryName || ''} onChange={(e) => onPaymentSettingChange('beneficiaryName', e.target.value)} placeholder="Nom du bénéficiaire" className={getFieldClass()} />
          <input value={form.paymentSettings.iban || ''} onChange={(e) => onPaymentSettingChange('iban', e.target.value)} placeholder="IBAN / compte bancaire" className={getFieldClass()} />
          <input value={form.paymentSettings.paypal || ''} onChange={(e) => onPaymentSettingChange('paypal', e.target.value)} placeholder="Email PayPal" className={getFieldClass()} />
          <input value={form.paymentSettings.orangeMoney || ''} onChange={(e) => onPaymentSettingChange('orangeMoney', e.target.value)} placeholder="Orange Money" className={getFieldClass()} />
          <input value={form.paymentSettings.wave || ''} onChange={(e) => onPaymentSettingChange('wave', e.target.value)} placeholder="Wave" className={getFieldClass()} />
          <input value={form.paymentSettings.freeMoney || ''} onChange={(e) => onPaymentSettingChange('freeMoney', e.target.value)} placeholder="Free Money" className={getFieldClass()} />
          <input value={form.paymentSettings.mtnMoney || ''} onChange={(e) => onPaymentSettingChange('mtnMoney', e.target.value)} placeholder="MTN Mobile Money" className={getFieldClass()} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Checklist visibilité</h2>
        <ul className="space-y-3 text-sm text-gray-600">
          <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span>Photo de profil</span>
            <span className={form.avatar ? 'text-emerald-600' : 'text-amber-600'}>{form.avatar ? 'OK' : 'À faire'}</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span>Bio et titre public</span>
            <span className={form.bio && form.publicTitle ? 'text-emerald-600' : 'text-amber-600'}>{form.bio && form.publicTitle ? 'OK' : 'À compléter'}</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span>Certifications</span>
            <span className={form.certifications.length > 0 ? 'text-emerald-600' : 'text-amber-600'}>{form.certifications.length}</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span>Portfolio</span>
            <span className={form.portfolioItems.length > 0 ? 'text-emerald-600' : 'text-amber-600'}>{form.portfolioItems.length}</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span>Vidéo de présentation</span>
            <span className={form.introVideo ? 'text-emerald-600' : 'text-amber-600'}>{form.introVideo ? 'OK' : 'À ajouter'}</span>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Prochaine étape</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>Le badge “expert vérifié” reste piloté par l’admin. Dès que le profil est complet, l’admin peut activer la vérification dans la gestion des utilisateurs.</p>
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
            Assurez-vous de renseigner photo, bio, au moins une certification, un portfolio et les coordonnées de paiement avant de demander la vérification.
          </p>
        </div>
      </section>
    </div>
  );
}
