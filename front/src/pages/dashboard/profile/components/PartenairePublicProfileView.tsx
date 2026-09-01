import DashboardLayout from '../../components/DashboardLayout';
import AvatarUpload from '@/components/base/AvatarUpload';
import type { AuthUser } from '@/lib/roles';
import type { Collaboration, TrackedProject } from '@/lib/projectApi';
import type { ProfileFormData } from './profileTypes';

interface PartenairePublicProfileViewProps {
  user: AuthUser | null;
  userInitials: string;
  publicName: string;
  formData: ProfileFormData;
  isEditing: boolean;
  partnerTypes: string[];
  partnerExpertise: string[];
  partnerTrackedProjects: TrackedProject[];
  partnerCollaborations: Collaboration[];
  activePartnerCollaborations: Collaboration[];
  totalPartnerInvestment: number;
  onAvatarChange: (url: string) => Promise<void>;
  onToggleEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => Promise<void>;
  onFormDataChange: (next: ProfileFormData) => void;
}

export default function PartenairePublicProfileView({
  user,
  userInitials,
  publicName,
  formData,
  isEditing,
  partnerTypes,
  partnerExpertise,
  partnerTrackedProjects,
  partnerCollaborations,
  activePartnerCollaborations,
  totalPartnerInvestment,
  onAvatarChange,
  onToggleEdit,
  onCancelEdit,
  onSave,
  onFormDataChange,
}: PartenairePublicProfileViewProps) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-teal-600">Profil public partenaire</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Votre fiche partenaire</h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Cette page presente votre positionnement public aux porteurs de projet. Les informations de compte, securite et preferences restent dans Parametres.
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
                  {user?.expertVerified ? (
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Partenaire verifie C2P</span>
                  ) : null}
                  {partnerTypes.map((type) => (
                    <span key={type} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {formatPartnerType(type)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-gray-600">
                  {formData.profession || 'Partenaire C2P'}
                </p>
                <p className="mt-1 text-sm text-gray-500">{formData.location || 'Localisation non renseignee'}</p>
                <p className="mt-4 max-w-3xl text-gray-700">
                  {formData.bio || 'Ajoutez une presentation courte pour expliquer votre expertise, votre these d accompagnement et le type de projets que vous pouvez soutenir.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(partnerExpertise.length ? partnerExpertise : formData.skills).map((item) => (
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
          <MetricCard value={partnerTrackedProjects.length} label="Projet(s) suivis" />
          <MetricCard value={activePartnerCollaborations.length} label="Collaboration(s) actives" tone="teal" />
          <MetricCard value={`${totalPartnerInvestment.toLocaleString('fr-FR')} FCFA`} label="Engagement suivi" tone="green" />
          <MetricCard value={partnerTypes.length || 1} label="Role(s) partenaire" tone="blue" />
        </div>

        {isEditing && (
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Informations publiques</h2>
            <p className="mt-1 text-sm text-gray-500">Ces informations sont visibles par les porteurs de projet. Ne mettez pas d informations sensibles ici.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <PublicField label="Prenom" value={formData.firstName} onChange={(value) => onFormDataChange({ ...formData, firstName: value })} />
              <PublicField label="Nom" value={formData.lastName} onChange={(value) => onFormDataChange({ ...formData, lastName: value })} />
              <PublicField label="Titre public" value={formData.profession} placeholder="Ex: Investisseur, Mentor produit, Partenaire technique" onChange={(value) => onFormDataChange({ ...formData, profession: value })} />
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
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Activite partenaire visible</h2>
              <p className="text-sm text-gray-500">Synthese des projets et collaborations rattaches a votre compte partenaire.</p>
            </div>
          </div>
          {partnerTrackedProjects.length === 0 && partnerCollaborations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="font-medium text-gray-900">Aucune activite publique pour le moment</p>
              <p className="mt-1 text-sm text-gray-500">Manifestez votre interet sur une opportunite pour alimenter cette fiche.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {partnerTrackedProjects.map((project) => (
                <article key={project.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">{project.title || 'Projet suivi'}</h3>
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                      {formatPartnerType(project.partner_type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Statut : {project.status || 'suivi'}</p>
                  <p className="mt-2 text-sm text-gray-600">Prochaine etape : {project.next_milestone || 'Coordination C2P'}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Engagement</span>
                    <span className="font-semibold text-gray-900">{Number(project.invested_amount || 0).toLocaleString('fr-FR')} FCFA</span>
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

function formatPartnerType(type?: string | null) {
  if (type === 'financier') return 'Financier';
  if (type === 'technique') return 'Technique';
  return type || 'Partenaire';
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
