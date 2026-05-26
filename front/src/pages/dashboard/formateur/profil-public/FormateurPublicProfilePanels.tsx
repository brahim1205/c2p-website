import { Link } from 'react-router-dom';
import FormateurPublicProfileSidePanel from './FormateurPublicProfileSidePanel';
import {
  CertificationsSection,
  IdentitySection,
  PortfolioSection,
  SkillsLanguagesSection,
  SocialVideoSection,
} from './FormateurPublicProfileEditorSections';
import type { useFormateurPublicProfileSession } from './useFormateurPublicProfileSession';

type FormateurPublicProfileSession = ReturnType<typeof useFormateurPublicProfileSession>;

export function FormateurPublicProfileHeader({ session }: { session: FormateurPublicProfileSession }) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profil public formateur</h1>
        <p className="mt-2 text-gray-600">Ce profil alimente votre page publique, vos preuves d’expertise et vos données de paiement.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {session.publicProfileUrl ? (
          <Link
            to={session.publicProfileUrl}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Prévisualiser la page publique
          </Link>
        ) : null}
        <button
          onClick={session.handleSave}
          disabled={session.saving || session.loading}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {session.saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

export function FormateurPublicProfileEditor({ session }: { session: FormateurPublicProfileSession }) {
  const { form } = session;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
      <div className="space-y-6">
        <IdentitySection session={session} />
        <SkillsLanguagesSection session={session} />
        <SocialVideoSection session={session} />
        <CertificationsSection session={session} />
        <PortfolioSection session={session} />
      </div>

      <FormateurPublicProfileSidePanel
        form={form}
        onPaymentSettingChange={session.patchPaymentSetting}
      />
    </div>
  );
}
