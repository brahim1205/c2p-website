import AvatarUpload from '@/components/base/AvatarUpload';
import type { AuthUser } from '@/lib/roles';
import type { ProfileFormData } from './profileTypes';

interface ProfileHeaderProps {
  user: AuthUser | null;
  userInitials: string;
  formData: ProfileFormData;
  isEditing: boolean;
  profileLoading: boolean;
  skillInput: string;
  langInput: string;
  onAvatarChange: (url: string) => Promise<void>;
  onToggleEdit: () => void;
  onSkillInputChange: (value: string) => void;
  onLangInputChange: (value: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skill: string) => void;
  onAddLanguage: () => void;
  onRemoveLanguage: (language: string) => void;
}

export default function ProfileHeader({
  user,
  userInitials,
  formData,
  isEditing,
  profileLoading,
  skillInput,
  langInput,
  onAvatarChange,
  onToggleEdit,
  onSkillInputChange,
  onLangInputChange,
  onAddSkill,
  onRemoveSkill,
  onAddLanguage,
  onRemoveLanguage,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 md:gap-6">
          <AvatarUpload
            src={user?.avatar ?? null}
            initials={userInitials}
            size="xl"
            editable={true}
            onChange={onAvatarChange}
          />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              {user ? `${user.firstName} ${user.lastName}` : `${formData.firstName} ${formData.lastName}`}
            </h1>
            <p className="text-gray-600 text-sm mb-2">
              {formData.profession} @ {formData.company}
            </p>
            {profileLoading && <p className="text-xs text-gray-400 mb-2">Synchronisation du profil...</p>}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                Compte vérifié
              </span>
              <span className="text-sm text-gray-500">Membre depuis 2024</span>
              <span className="text-sm text-gray-500">{formData.experience} d&apos;expérience</span>
            </div>
          </div>
        </div>
        <button
          onClick={onToggleEdit}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
        >
          {isEditing ? 'Annuler' : 'Modifier le profil'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {formData.skills.map((skill) => (
          <span key={skill} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs">
            {skill}
            {isEditing && (
              <button onClick={() => onRemoveSkill(skill)} className="w-4 h-4 flex items-center justify-center hover:text-red-500 cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            )}
          </span>
        ))}
        {isEditing && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(event) => onSkillInputChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onAddSkill()}
              placeholder="Ajouter..."
              className="px-3 py-1 border border-gray-300 rounded-full text-xs w-28 outline-none focus:border-teal-500"
            />
            <button onClick={onAddSkill} className="w-6 h-6 flex items-center justify-center bg-teal-500 text-white rounded-full hover:bg-teal-600 cursor-pointer">
              <i className="ri-add-line text-xs"></i>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 mr-1">Langues:</span>
        {formData.languages.map((lang) => (
          <span key={lang} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
            {lang}
            {isEditing && (
              <button onClick={() => onRemoveLanguage(lang)} className="w-3 h-3 flex items-center justify-center hover:text-red-500 cursor-pointer">
                <i className="ri-close-line text-[10px]"></i>
              </button>
            )}
          </span>
        ))}
        {isEditing && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={langInput}
              onChange={(event) => onLangInputChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onAddLanguage()}
              placeholder="Ajouter..."
              className="px-2 py-0.5 border border-gray-300 rounded-full text-xs w-24 outline-none focus:border-teal-500"
            />
            <button onClick={onAddLanguage} className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 cursor-pointer">
              <i className="ri-add-line text-[10px]"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
