import DashboardLayout from '../../components/DashboardLayout';
import AvatarUpload from '@/components/base/AvatarUpload';
import type { AuthUser } from '@/lib/roles';
import type { ProjectPartnership, ProjectRecord } from '@/lib/projectApi';
import type { ProfileFormData } from './profileTypes';

interface PorteurPublicProfileViewProps {
  user: AuthUser | null;
  userInitials: string;
  publicName: string;
  formData: ProfileFormData;
  isEditing: boolean;
  porteurSectors: string[];
  porteurProjects: ProjectRecord[];
  porteurPartnerships: ProjectPartnership[];
  totalRaised: number;
  totalFundingTarget: number;
  onAvatarChange: (url: string) => Promise<void>;
  onToggleEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => Promise<void>;
  onFormDataChange: (next: ProfileFormData) => void;
}

export default function PorteurPublicProfileView({
  user,
  userInitials,
  publicName,
  formData,
  isEditing,
  porteurSectors,
  porteurProjects,
  porteurPartnerships,
  totalRaised,
  totalFundingTarget,
  onAvatarChange,
  onToggleEdit,
  onCancelEdit,
  onSave,
  onFormDataChange,
}: PorteurPublicProfileViewProps) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-teal-600">Profil public porteur</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Votre fiche de confiance</h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Cette page presente votre identite publique, vos projets et votre credibilite aux partenaires, mentors et investisseurs. Les informations privees restent dans Parametres.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row">
              <AvatarUpload
                src={user?.avatar ?? null}
                initials={userInitials}
                size="xl"
                editable={true}
                onChange={onAvatarChange}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">{publicName}</h2>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Verifie C2P</span>
                </div>
                <p className="mt-2 text-gray-600">{formData.profession || 'Porteur de projet'}{formData.company ? ` · ${formData.company}` : ''}</p>
                <p className="mt-1 text-sm text-gray-500">{formData.location || 'Localisation non renseignee'}</p>
                <p className="mt-4 max-w-3xl text-gray-700">
                  {formData.bio || 'Ajoutez une presentation courte pour expliquer votre parcours, votre vision et la valeur de vos projets.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(porteurSectors.length ? porteurSectors : formData.skills).map((item) => (
                    <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleEdit}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              {isEditing ? 'Fermer edition' : 'Modifier la fiche'}
            </button>
          </div>
        </section>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard value={porteurProjects.length} label="Projet(s) portes" />
          <MetricCard value={porteurPartnerships.length} label="Partenaire(s) rattaches" tone="teal" />
          <MetricCard value={`${totalRaised.toLocaleString('fr-FR')} FCFA`} label="Financement leve" tone="green" />
          <MetricCard value={`${totalFundingTarget.toLocaleString('fr-FR')} FCFA`} label="Objectif suivi" tone="blue" />
        </div>

        {isEditing && (
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Informations publiques</h2>
            <p className="mt-1 text-sm text-gray-500">Ces champs alimentent votre fiche publique. Email, telephone, securite et suppression de compte restent dans Parametres.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <PublicField label="Prenom" value={formData.firstName} onChange={(value) => onFormDataChange({ ...formData, firstName: value })} />
              <PublicField label="Nom" value={formData.lastName} onChange={(value) => onFormDataChange({ ...formData, lastName: value })} />
              <PublicField label="Titre public" value={formData.profession} placeholder="Ex: Fondateur, Porteur de projet, CEO" onChange={(value) => onFormDataChange({ ...formData, profession: value })} />
              <PublicField label="Organisation" value={formData.company} placeholder="Nom du projet ou structure" onChange={(value) => onFormDataChange({ ...formData, company: value })} />
              <PublicField label="Localisation publique" value={formData.location} onChange={(value) => onFormDataChange({ ...formData, location: value })} />
              <PublicField label="LinkedIn ou site public" value={formData.linkedin || formData.website} onChange={(value) => onFormDataChange({ ...formData, linkedin: value })} />
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Presentation publique</label>
                <textarea
                  value={formData.bio}
                  onChange={(event) => onFormDataChange({ ...formData, bio: event.target.value })}
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                <p className="mt-1 text-xs text-gray-500">{formData.bio.length}/500 caracteres</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={onCancelEdit} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button type="button" onClick={onSave} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">Enregistrer la fiche</button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">Projets publics rattaches</h2>
            <p className="text-sm text-gray-500">Les partenaires voient les projets suivis par C2P, sans les documents sensibles.</p>
          </div>
          {porteurProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="font-medium text-gray-900">Aucun projet public pour le moment</p>
              <p className="mt-1 text-sm text-gray-500">Soumettez un projet pour enrichir votre fiche publique.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {porteurProjects.map((project) => (
                <article key={project.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{project.status}</span>
                  </div>
                  <p className="line-clamp-3 text-sm text-gray-600">{project.description || project.impact || 'Description en cours de preparation.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">{project.sector || project.category}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">{project.location || 'Localisation C2P'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ value, label, tone = 'gray' }: { value: string | number; label: string; tone?: 'gray' | 'teal' | 'green' | 'blue' }) {
  const valueClass = {
    gray: 'text-gray-900',
    teal: 'text-teal-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
  }[tone];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function PublicField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
    </div>
  );
}
