import AvatarUpload from '@/components/base/AvatarUpload';
import {
  emptyCertification,
  emptyPortfolioItem,
  getFieldClass,
} from './formateurPublicProfileModel';
import { ListSectionHeader, ProfileTextField, RemoveButton, TagEditor } from './FormateurPublicProfileControls';
import type { useFormateurPublicProfileSession } from './useFormateurPublicProfileSession';

type FormateurPublicProfileSession = ReturnType<typeof useFormateurPublicProfileSession>;

export function IdentitySection({ session }: { session: FormateurPublicProfileSession }) {
  const { form, user } = session;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <AvatarUpload
            src={form.avatar || null}
            initials={session.userInitials}
            size="xl"
            editable
            onChange={(url) => session.patchForm('avatar', url)}
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user ? `${user.firstName} ${user.lastName}` : 'Profil formateur'}
            </h2>
            <p className="text-sm text-gray-600">{form.publicTitle || 'Ajoutez un titre public pour clarifier votre positionnement.'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${user?.expertVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                {user?.expertVerified ? 'Expert vérifié' : 'En attente de vérification admin'}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${form.publicProfileEnabled ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                {form.publicProfileEnabled ? 'Profil public actif' : 'Profil public masqué'}
              </span>
            </div>
          </div>
        </div>
        <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(form.publicProfileEnabled)}
            onChange={(event) => session.patchForm('publicProfileEnabled', event.target.checked)}
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          Rendre le profil public
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileTextField
          className="md:col-span-2"
          label="Titre public"
          value={form.publicTitle || ''}
          onChange={(value) => session.patchForm('publicTitle', value)}
          placeholder="Ex: Formatrice React et marketing digital"
        />
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            rows={5}
            value={form.bio || ''}
            onChange={(event) => session.patchForm('bio', event.target.value)}
            placeholder="Présentez votre expertise, votre méthode et vos résultats."
            className={`${getFieldClass()} resize-none`}
          />
        </div>
        <ProfileTextField
          label="Site web"
          type="url"
          value={form.website || ''}
          onChange={(value) => session.patchForm('website', value)}
          placeholder="https://..."
        />
        <ProfileTextField
          label="Langue principale"
          value={form.preferredLanguage || ''}
          onChange={(value) => session.patchForm('preferredLanguage', value)}
          placeholder="Français"
        />
      </div>
    </section>
  );
}

export function SkillsLanguagesSection({ session }: { session: FormateurPublicProfileSession }) {
  const { form } = session;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Compétences et langues</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <TagEditor
          label="Compétences"
          value={session.skillInput}
          placeholder="Ajouter une compétence"
          tags={form.skills}
          tagClassName="bg-teal-50 text-teal-700"
          onInputChange={session.setSkillInput}
          onAdd={session.addSkill}
          onRemove={(skill) => session.patchForm('skills', form.skills.filter((item) => item !== skill))}
        />
        <TagEditor
          label="Langues"
          value={session.languageInput}
          placeholder="Ajouter une langue"
          tags={form.languages}
          tagClassName="bg-blue-50 text-blue-700"
          onInputChange={session.setLanguageInput}
          onAdd={session.addLanguage}
          onRemove={(language) => session.patchForm('languages', form.languages.filter((item) => item !== language))}
        />
      </div>
    </section>
  );
}

export function SocialVideoSection({ session }: { session: FormateurPublicProfileSession }) {
  const { form } = session;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Réseaux et vidéo</h2>
        <button
          type="button"
          onClick={() => session.videoInputRef.current?.click()}
          disabled={session.videoUploading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {session.videoUploading ? `Import ${session.videoUploadProgress}%` : 'Importer une vidéo'}
        </button>
      </div>
      <input ref={session.videoInputRef} type="file" accept="video/*" className="hidden" onChange={session.handleIntroVideoUpload} />
      <div className="grid gap-4 md:grid-cols-2">
        {(['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'] as const).map((network) => (
          <ProfileTextField
            key={network}
            label={network.replace('_', ' ')}
            type="url"
            value={form.socialLinks[network] || ''}
            onChange={(value) => session.patchSocialLink(network, value)}
            placeholder="https://..."
            labelClassName="capitalize"
          />
        ))}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Vidéo de présentation</label>
          <input
            type="url"
            value={form.introVideo || ''}
            onChange={(event) => session.patchForm('introVideo', event.target.value)}
            placeholder="https://.../presentation.mp4"
            className={getFieldClass()}
          />
          {session.videoUploading ? (
            <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-teal-700">
                <span>Upload de la vidéo en cours</span>
                <span>{session.videoUploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-teal-100">
                <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${session.videoUploadProgress}%` }} />
              </div>
            </div>
          ) : null}
          {form.introVideo ? (
            <video src={form.introVideo} controls className="mt-3 h-56 w-full rounded-xl border border-gray-200 bg-black object-cover" />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function CertificationsSection({ session }: { session: FormateurPublicProfileSession }) {
  const { form } = session;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <ListSectionHeader title="Certifications" onAdd={() => session.patchForm('certifications', [...form.certifications, emptyCertification()])} />
      <div className="space-y-4">
        {form.certifications.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 p-4">
            <RemoveButton onClick={() => session.patchForm('certifications', form.certifications.filter((entry) => entry.id !== item.id))} />
            <div className="grid gap-4 md:grid-cols-2">
              <input value={item.title} onChange={(event) => session.patchCertification(item.id, 'title', event.target.value)} placeholder="Titre" className={getFieldClass()} />
              <input value={item.issuer} onChange={(event) => session.patchCertification(item.id, 'issuer', event.target.value)} placeholder="Organisme" className={getFieldClass()} />
              <input value={item.year} onChange={(event) => session.patchCertification(item.id, 'year', event.target.value)} placeholder="Année" className={getFieldClass()} />
              <input value={item.credentialUrl || ''} onChange={(event) => session.patchCertification(item.id, 'credentialUrl', event.target.value)} placeholder="URL justificatif" className={getFieldClass()} />
            </div>
          </div>
        ))}
        {form.certifications.length === 0 ? <p className="text-sm text-gray-500">Aucune certification renseignée.</p> : null}
      </div>
    </section>
  );
}

export function PortfolioSection({ session }: { session: FormateurPublicProfileSession }) {
  const { form } = session;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <ListSectionHeader title="Portfolio" onAdd={() => session.patchForm('portfolioItems', [...form.portfolioItems, emptyPortfolioItem()])} />
      <div className="space-y-4">
        {form.portfolioItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 p-4">
            <RemoveButton onClick={() => session.patchForm('portfolioItems', form.portfolioItems.filter((entry) => entry.id !== item.id))} />
            <div className="grid gap-4 md:grid-cols-2">
              <input value={item.title} onChange={(event) => session.patchPortfolioItem(item.id, 'title', event.target.value)} placeholder="Titre" className={getFieldClass()} />
              <input value={item.url || ''} onChange={(event) => session.patchPortfolioItem(item.id, 'url', event.target.value)} placeholder="URL du projet" className={getFieldClass()} />
              <input value={item.image || ''} onChange={(event) => session.patchPortfolioItem(item.id, 'image', event.target.value)} placeholder="URL visuel" className={`${getFieldClass()} md:col-span-2`} />
              <textarea value={item.summary} onChange={(event) => session.patchPortfolioItem(item.id, 'summary', event.target.value)} rows={3} placeholder="Résumé du projet ou cas client" className={`${getFieldClass()} resize-none md:col-span-2`} />
            </div>
          </div>
        ))}
        {form.portfolioItems.length === 0 ? <p className="text-sm text-gray-500">Ajoutez au moins un cas client ou une réalisation.</p> : null}
      </div>
    </section>
  );
}
