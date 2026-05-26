import PorteurPublicProfileView from './components/PorteurPublicProfileView';
import PartenairePublicProfileView from './components/PartenairePublicProfileView';
import ProfileStandardView from './ProfileStandardView';
import { useProfilePageSession } from './useProfilePageSession';

export default function ProfilePage() {
  const session = useProfilePageSession();

  if (session.isPorteur) {
    return (
      <PorteurPublicProfileView
        user={session.user}
        userInitials={session.userInitials}
        publicName={session.publicName}
        formData={session.formData}
        isEditing={session.isEditing}
        porteurSectors={session.porteurSectors}
        porteurProjects={session.porteurProjects}
        porteurPartnerships={session.porteurPartnerships}
        totalRaised={session.totalRaised}
        totalFundingTarget={session.totalFundingTarget}
        onAvatarChange={session.handleAvatarChange}
        onToggleEdit={() => session.setIsEditing((value) => !value)}
        onCancelEdit={() => session.setIsEditing(false)}
        onSave={session.handleSave}
        onFormDataChange={session.setFormData}
      />
    );
  }

  if (session.isPartenaire) {
    return (
      <PartenairePublicProfileView
        user={session.user}
        userInitials={session.userInitials}
        publicName={session.publicName}
        formData={session.formData}
        isEditing={session.isEditing}
        partnerTypes={session.partnerTypes}
        partnerExpertise={session.partnerExpertise}
        partnerTrackedProjects={session.partnerTrackedProjects}
        partnerCollaborations={session.partnerCollaborations}
        activePartnerCollaborations={session.activePartnerCollaborations}
        totalPartnerInvestment={session.totalPartnerInvestment}
        onAvatarChange={session.handleAvatarChange}
        onToggleEdit={() => session.setIsEditing((value) => !value)}
        onCancelEdit={() => session.setIsEditing(false)}
        onSave={session.handleSave}
        onFormDataChange={session.setFormData}
      />
    );
  }

  return <ProfileStandardView session={session} />;
}
