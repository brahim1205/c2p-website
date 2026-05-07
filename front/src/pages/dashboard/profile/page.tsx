import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import AvatarUpload from '@/components/base/AvatarUpload';
import BadgeShowcase from './components/BadgeShowcase';
import LearningStats from './components/LearningStats';
import CertificateViewer, { CertificateData } from './components/CertificateViewer';
import LevelSystem from './components/LevelSystem';
import {
  loadCourseHistory,
} from '../apprenant/cours/[id]/storage';

export default function ProfilePage() {
  const { success, info } = useToast();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? 'Jean',
    lastName: user?.lastName ?? 'Dupont',
    email: user?.email ?? 'jean.dupont@example.com',
    phone: user?.phone ?? '+221 77 XXX XX XX',
    bio: 'Professionnel passionné par le développement et l\'innovation. Spécialisé dans les solutions digitales pour les PME africaines.',
    location: 'Dakar, Sénégal',
    website: 'www.jeandupont.com',
    linkedin: 'linkedin.com/in/jeandupont',
    twitter: 'twitter.com/jeandupont',
    profession: 'Consultant Digital',
    company: 'C2P Consulting',
    experience: '5 ans',
    skills: ['Développement Web', 'Marketing Digital', 'Gestion de Projet', 'UI/UX Design'],
    languages: ['Français', 'Anglais', 'Wolof'],
  });

  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');

  const handleSave = () => {
    if (user) {
      updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
    }
    success('Profil mis à jour', 'Vos informations ont été enregistrées avec succès.');
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      info('Champs requis', 'Veuillez remplir tous les champs du mot de passe.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      info('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      info('Mots de passe différents', 'Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }
    success('Mot de passe mis à jour', 'Votre mot de passe a été changé avec succès.');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const addLanguage = () => {
    if (langInput.trim() && !formData.languages.includes(langInput.trim())) {
      setFormData({ ...formData, languages: [...formData.languages, langInput.trim()] });
      setLangInput('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData({ ...formData, languages: formData.languages.filter((l) => l !== lang) });
  };

  const userInitials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const history = loadCourseHistory();
  const completedCourses = history.filter((h) => h.progress === 100);

  const generateCertificate = (entry: typeof completedCourses[number]) => {
    const certData: CertificateData = {
      studentName: user ? `${user.firstName} ${user.lastName}` : `${formData.firstName} ${formData.lastName}`,
      courseTitle: entry.title,
      instructor: entry.instructor,
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      certificateId: `CERT-${entry.courseId}-${Date.now().toString(36).toUpperCase()}`,
    };
    setCertificate(certData);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Profil' }]} />

        {/* Profile Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="relative">
                <AvatarUpload
                  src={user?.avatar ?? null}
                  initials={userInitials}
                  size="xl"
                  editable={true}
                  onChange={(url) => updateUser({ avatar: url })}
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  {user ? `${user.firstName} ${user.lastName}` : `${formData.firstName} ${formData.lastName}`}
                </h1>
                <p className="text-gray-600 text-sm mb-2">{formData.profession} @ {formData.company}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mr-2"></div>
                    Compte vérifié
                  </span>
                  <span className="text-sm text-gray-500">Membre depuis 2024</span>
                  <span className="text-sm text-gray-500">{formData.experience} d&apos;expérience</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isEditing ? 'Annuler' : 'Modifier le profil'}
            </button>
          </div>

          {/* Skills tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs"
              >
                {skill}
                {isEditing && (
                  <button
                    onClick={() => removeSkill(skill)}
                    className="w-4 h-4 flex items-center justify-center hover:text-red-500 cursor-pointer"
                  >
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
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  placeholder="Ajouter..."
                  className="px-3 py-1 border border-gray-300 rounded-full text-xs w-28 outline-none focus:border-teal-500"
                />
                <button onClick={addSkill} className="w-6 h-6 flex items-center justify-center bg-teal-500 text-white rounded-full hover:bg-teal-600 cursor-pointer">
                  <i className="ri-add-line text-xs"></i>
                </button>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 mr-1">Langues:</span>
            {formData.languages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs"
              >
                {lang}
                {isEditing && (
                  <button
                    onClick={() => removeLanguage(lang)}
                    className="w-3 h-3 flex items-center justify-center hover:text-red-500 cursor-pointer"
                  >
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
                  onChange={(e) => setLangInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLanguage()}
                  placeholder="Ajouter..."
                  className="px-2 py-0.5 border border-gray-300 rounded-full text-xs w-24 outline-none focus:border-teal-500"
                />
                <button onClick={addLanguage} className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 cursor-pointer">
                  <i className="ri-add-line text-[10px]"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto space-x-4 md:space-x-8 px-4 md:px-6">
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'personal'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Informations personnelles
              </button>
              <button
                onClick={() => setActiveTab('professional')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'professional'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Informations professionnelles
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'security'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Sécurité
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'stats'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <i className="ri-bar-chart-box-line text-sm"></i>
                  Statistiques
                </div>
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'badges'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <i className="ri-medal-line text-sm"></i>
                  Badges
                </div>
              </button>
              <button
                onClick={() => setActiveTab('levels')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'levels'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <i className="ri-seedling-line text-sm"></i>
                  Niveaux
                </div>
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="dashboard-form-grid">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={!isEditing}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      disabled={!isEditing}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localisation
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={!isEditing}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Biographie
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    rows={4}
                    maxLength={500}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 caractères</p>
                </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Professional Information Tab */}
            {activeTab === 'professional' && (
              <div className="space-y-6">
                <div className="dashboard-form-grid">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profession / Titre
                    </label>
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      disabled={!isEditing}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entreprise / Organisation
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      disabled={!isEditing}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Années d&apos;expérience
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    disabled={!isEditing}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 cursor-pointer"
                  >
                    <option value="Moins d&apos;un an">Moins d&apos;un an</option>
                    <option value="1-3 ans">1-3 ans</option>
                    <option value="3-5 ans">3-5 ans</option>
                    <option value="5-10 ans">5-10 ans</option>
                    <option value="Plus de 10 ans">Plus de 10 ans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site web
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={!isEditing}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    disabled={!isEditing}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twitter / X
                  </label>
                  <input
                    type="url"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    disabled={!isEditing}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Change Password */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Changer le mot de passe</h3>
                  <div className="dashboard-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe actuel
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmer le nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={handlePasswordChange}
                      className="dashboard-form-wide px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Mettre à jour le mot de passe
                    </button>
                  </div>
                </div>

                {/* 2FA */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Authentification à deux facteurs</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Ajoutez une couche de sécurité supplémentaire à votre compte
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setTwoFAEnabled(!twoFAEnabled);
                        success(
                          twoFAEnabled ? '2FA désactivé' : '2FA activé',
                          twoFAEnabled ? 'L\'authentification à deux facteurs est maintenant désactivée.' : 'L\'authentification à deux facteurs est maintenant active sur votre compte.'
                        );
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        twoFAEnabled
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {twoFAEnabled ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                  {twoFAEnabled && (
                    <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <i className="ri-shield-check-line text-teal-600"></i>
                        </div>
                        <span className="text-sm font-medium text-teal-800">2FA est activé</span>
                      </div>
                      <p className="text-xs text-teal-700">
                        Vous recevrez un code de vérification à chaque connexion.
                      </p>
                    </div>
                  )}
                </div>

                {/* Delete Account */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-red-600 mb-2">Zone de danger</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    La suppression de votre compte est irréversible. Toutes vos données seront perdues.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Supprimer mon compte
                  </button>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <LearningStats />

                {/* Certificates section */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i className="ri-award-line text-amber-500"></i>
                    Mes certificats
                  </h3>
                  {completedCourses.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <i className="ri-award-line text-gray-400 text-lg"></i>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">Aucun certificat pour le moment</p>
                      <p className="text-xs text-gray-400">Complétez un cours à 100% pour obtenir votre certificat</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedCourses.map((entry) => (
                        <div key={entry.courseId} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <i className="ri-award-line text-amber-600 text-sm"></i>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{entry.title}</p>
                              <p className="text-xs text-gray-500">Par {entry.instructor}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => generateCertificate(entry)}
                            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
                          >
                            <i className="ri-eye-line mr-1"></i>
                            Voir le certificat
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
              <BadgeShowcase />
            )}

            {/* Levels Tab */}
            {activeTab === 'levels' && (
              <LevelSystem />
            )}
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {certificate && (
        <CertificateViewer data={certificate} onClose={() => setCertificate(null)} />
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-alert-line text-red-600 text-xl"></i>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Supprimer votre compte ?</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Cette action est irréversible. Toutes vos données, formations, projets et messages seront définitivement supprimés.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  success('Compte supprimé', 'Votre compte a été supprimé. Vous allez être redirigé.');
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
