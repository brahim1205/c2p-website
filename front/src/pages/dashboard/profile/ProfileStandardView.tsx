import DashboardLayout from '../components/DashboardLayout';
import BadgeShowcase from './components/BadgeShowcase';
import LearningStats from './components/LearningStats';
import CertificateViewer from './components/CertificateViewer';
import LevelSystem from './components/LevelSystem';
import ProfileHeader from './components/ProfileHeader';
import ProfileCertificatesPanel from './components/ProfileCertificatesPanel';
import DeleteAccountModal from './components/DeleteAccountModal';
import {
  ProfilePersonalTab,
  ProfileProfessionalTab,
  ProfileSecurityTab,
} from './components/ProfileStandardTabs';
import { PROFILE_TABS } from './profilePageModel';
import type { useProfilePageSession } from './useProfilePageSession';

type ProfilePageSession = ReturnType<typeof useProfilePageSession>;

interface ProfileStandardViewProps {
  session: ProfilePageSession;
}

export default function ProfileStandardView({ session }: ProfileStandardViewProps) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <ProfileHeader
          user={session.user}
          userInitials={session.userInitials}
          formData={session.formData}
          isEditing={session.isEditing}
          profileLoading={session.profileLoading}
          skillInput={session.skillInput}
          langInput={session.langInput}
          onAvatarChange={session.handleAvatarChange}
          onToggleEdit={() => session.setIsEditing(!session.isEditing)}
          onSkillInputChange={session.setSkillInput}
          onLangInputChange={session.setLangInput}
          onAddSkill={session.addSkill}
          onRemoveSkill={session.removeSkill}
          onAddLanguage={session.addLanguage}
          onRemoveLanguage={session.removeLanguage}
        />

        <div className="mb-6 rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200">
            <div className="flex space-x-4 overflow-x-auto px-4 md:space-x-8 md:px-6">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => session.setActiveTab(tab.id)}
                  className={`cursor-pointer whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    session.activeTab === tab.id
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon ? (
                    <div className="flex items-center gap-1.5">
                      <i className={`${tab.icon} text-sm`}></i>
                      {tab.label}
                    </div>
                  ) : tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {session.activeTab === 'personal' ? (
              <ProfilePersonalTab
                formData={session.formData}
                isEditing={session.isEditing}
                onCancelEdit={() => session.setIsEditing(false)}
                onFormDataChange={session.setFormData}
                onSave={session.handleSave}
              />
            ) : null}

            {session.activeTab === 'professional' ? (
              <ProfileProfessionalTab
                formData={session.formData}
                isEditing={session.isEditing}
                onCancelEdit={() => session.setIsEditing(false)}
                onFormDataChange={session.setFormData}
                onSave={session.handleSave}
              />
            ) : null}

            {session.activeTab === 'security' ? (
              <ProfileSecurityTab
                passwordData={session.passwordData}
                onDeleteAccountRequest={() => session.setShowDeleteConfirm(true)}
                onPasswordChange={session.handlePasswordChange}
                onPasswordDataChange={session.setPasswordData}
              />
            ) : null}

            {session.activeTab === 'stats' ? (
              <div className="space-y-6">
                <LearningStats />
                <ProfileCertificatesPanel completedCourses={session.completedCourses} onOpenCertificate={session.generateCertificate} />
              </div>
            ) : null}

            {session.activeTab === 'badges' ? <BadgeShowcase /> : null}

            {session.activeTab === 'levels' ? <LevelSystem /> : null}
          </div>
        </div>
      </div>

      {session.certificate ? (
        <CertificateViewer data={session.certificate} onClose={() => session.setCertificate(null)} />
      ) : null}

      {session.showDeleteConfirm ? (
        <DeleteAccountModal
          isDeleting={session.isDeletingAccount}
          onCancel={() => session.setShowDeleteConfirm(false)}
          onConfirm={session.handleDeleteAccount}
        />
      ) : null}
    </DashboardLayout>
  );
}
