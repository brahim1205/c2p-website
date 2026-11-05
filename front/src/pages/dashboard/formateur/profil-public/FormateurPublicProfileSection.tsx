import FormateurPublicProfileStats from './FormateurPublicProfileStats';
import { FormateurPublicProfileEditor, FormateurPublicProfileHeader } from './FormateurPublicProfilePanels';
import { useFormateurPublicProfileSession } from './useFormateurPublicProfileSession';

/** Instructor public profile editor, shown as the "Profil public" tab of the settings page (like Udemy). */
export default function FormateurPublicProfileSection() {
  const session = useFormateurPublicProfileSession();
  return (
    <div className="p-5 sm:p-6">
      <FormateurPublicProfileHeader session={session} />
      <FormateurPublicProfileStats stats={session.stats} />
      <FormateurPublicProfileEditor session={session} />
    </div>
  );
}
