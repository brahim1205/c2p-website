import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export default function SubmitProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  type SubmitProjectFormData = {
    projectName: string;
    category: string;
    stage: string;
    location: string;
    shortDescription: string;
    problemStatement: string;
    solution: string;
    targetMarket: string;
    businessModel: string;
    competition: string;
    founderName: string;
    founderEmail: string;
    founderPhone: string;
    founderBio: string;
    teamSize: string;
    fundingGoal: string;
    fundingType: string;
    currentFunding: string;
    useOfFunds: string;
    businessPlan: string | null;
    pitchDeck: string | null;
    financialProjections: string | null;
  };

  const [formData, setFormData] = useState<SubmitProjectFormData>({
    // Étape 1: Informations de base
    projectName: '',
    category: '',
    stage: '',
    location: '',
    shortDescription: '',
    
    // Étape 2: Description détaillée
    problemStatement: '',
    solution: '',
    targetMarket: '',
    businessModel: '',
    competition: '',
    
    // Étape 3: Équipe
    founderName: '',
    founderEmail: '',
    founderPhone: '',
    founderBio: '',
    teamSize: '',
    
    // Étape 4: Financement
    fundingGoal: '',
    fundingType: '',
    currentFunding: '',
    useOfFunds: '',
    
    // Étape 5: Documents
    businessPlan: null,
    pitchDeck: null,
    financialProjections: null
  });

  const totalSteps = 5;

  const categories = [
    'Technologies',
    'Agriculture',
    'Commerce',
    'Éducation',
    'Santé',
    'Artisanat',
    'Énergie',
    'Transport',
    'Finance',
    'Autre'
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fundingGoal = Number(formData.fundingGoal || 0);
      const currentFunding = Number(formData.currentFunding || 0);
      const projectPayload = {
        owner_id: user?.id || `guest-${Date.now()}`,
        title: formData.projectName,
        description: formData.shortDescription || formData.solution,
        category: formData.category.toLowerCase() || 'autre',
        sector: formData.category || 'Autre',
        status: 'pre-incubation',
        phase: formData.stage || 'idee',
        porteur_name: formData.founderName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Porteur de projet',
        funding: currentFunding,
        funding_goal: fundingGoal,
        team_size: Number.parseInt(formData.teamSize, 10) || 1,
        mentors: 0,
        progress: 12,
        location: formData.location,
        impact: formData.problemStatement,
        looking_for: [formData.fundingType || 'Accompagnement'],
        image: '/images/home/venture.jpg',
      };

      const { data: createdProject, error: projectError } = await backendClient
        .from('projects')
        .insert(projectPayload)
        .select('*')
        .single();

      if (projectError || !createdProject) {
        throw new Error(projectError?.message || 'La creation du projet a echoue.');
      }

      const projectId = Number((createdProject as { id: number }).id);

      await Promise.all([
        backendClient.from('project_milestones').insert({
          project_id: projectId,
          title: 'Etude de recevabilite',
          description: 'Analyse initiale du dossier et cadrage du projet.',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: 'pending',
          progress: 0,
          tasks: [
            { id: 1, title: 'Verification du dossier', completed: false },
            { id: 2, title: 'Evaluation de la proposition de valeur', completed: false },
          ],
        }),
        backendClient.from('project_history').insert({
          project_id: projectId,
          date: new Date().toISOString(),
          user: projectPayload.porteur_name,
          action: 'Projet soumis depuis le formulaire public',
          type: 'submission',
        }),
        fundingGoal > 0
          ? backendClient.from('project_funding_rounds').insert({
              project_id: projectId,
              type: formData.fundingType === 'equity' ? 'amorcage' : formData.fundingType === 'don' ? 'subvention' : 'mixte',
              target_amount: fundingGoal,
              raised_amount: currentFunding,
              deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              start_date: new Date().toISOString().slice(0, 10),
              status: 'en_cours',
              description: formData.useOfFunds,
              pitch_deck: false,
              business_plan: false,
              next_milestone: 'Revue initiale du dossier',
            })
          : Promise.resolve({ data: null, error: null }),
        ...[
          formData.businessPlan ? { name: String(formData.businessPlan), type: 'pdf', category: 'strategie' } : null,
          formData.pitchDeck ? { name: String(formData.pitchDeck), type: 'ppt', category: 'pitch' } : null,
          formData.financialProjections ? { name: String(formData.financialProjections), type: 'excel', category: 'finance' } : null,
        ]
          .filter(Boolean)
          .map((document) =>
            backendClient.from('project_documents').insert({
              project_id: projectId,
              name: document?.name,
              type: document?.type,
              size: 'A televerser',
              date: new Date().toISOString().slice(0, 10),
              category: document?.category,
            }),
          ),
      ]);

      success('Projet soumis', 'Votre dossier a ete cree dans ProjectCenter.');
      navigate(user?.role === 'porteur' ? '/dashboard/porteur/mes-projets' : `/project-center`);
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le projet n a pas pu etre soumis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="pt-24 pb-12 bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
            <i className="ri-rocket-line text-teal-500"></i>
            <span className="text-sm font-medium text-gray-700">Soumission de projet</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Soumettez votre projet
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Remplissez ce formulaire pour soumettre votre projet à notre programme d'incubation. Notre équipe l'examinera et vous contactera sous 48h.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-40">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step < currentStep ? 'bg-teal-500 text-white' :
                    step === currentStep ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {step < currentStep ? <i className="ri-check-line"></i> : step}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    step === currentStep ? 'text-teal-600' : 'text-gray-500'
                  }`}>
                    {step === 1 && 'Informations'}
                    {step === 2 && 'Description'}
                    {step === 3 && 'Équipe'}
                    {step === 4 && 'Financement'}
                    {step === 5 && 'Documents'}
                  </span>
                </div>
                {step < 5 && (
                  <div className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                    step < currentStep ? 'bg-teal-500' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Étape 1: Informations de base */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Informations de base</h2>
                <p className="text-gray-600">Commencez par nous présenter votre projet en quelques mots.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du projet *</label>
                <input
                  type="text"
                  required
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  placeholder="Ex: AgriConnect"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stade du projet *</label>
                  <select
                    required
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Sélectionnez un stade</option>
                    <option value="idee">Idée</option>
                    <option value="prototype">Prototype</option>
                    <option value="mvp">MVP développé</option>
                    <option value="lancement">Lancé sur le marché</option>
                    <option value="croissance">En croissance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Localisation *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  placeholder="Ex: Dakar, Sénégal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description courte *</label>
                <textarea
                  required
                  rows={3}
                  maxLength={200}
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Décrivez votre projet en une phrase accrocheuse..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 200 caractères</p>
              </div>
            </div>
          )}

          {/* Étape 2: Description détaillée */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Description détaillée</h2>
                <p className="text-gray-600">Expliquez-nous votre projet en détail.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Problème identifié *</label>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Quel problème votre projet résout-il ?"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Solution proposée *</label>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={formData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Comment votre projet résout-il ce problème ?"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marché cible *</label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={formData.targetMarket}
                  onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Qui sont vos clients cibles ? Quelle est la taille du marché ?"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modèle économique *</label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={formData.businessModel}
                  onChange={(e) => setFormData({ ...formData, businessModel: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Comment allez-vous générer des revenus ?"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Concurrence</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={formData.competition}
                  onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Qui sont vos concurrents ? Quelle est votre différenciation ?"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
              </div>
            </div>
          )}

          {/* Étape 3: Équipe */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Votre équipe</h2>
                <p className="text-gray-600">Parlez-nous de vous et de votre équipe.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du fondateur *</label>
                  <input
                    type="text"
                    required
                    value={formData.founderName}
                    onChange={(e) => setFormData({ ...formData, founderName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="Votre nom complet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.founderEmail}
                    onChange={(e) => setFormData({ ...formData, founderEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.founderPhone}
                    onChange={(e) => setFormData({ ...formData, founderPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="+221 XX XXX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taille de l'équipe *</label>
                  <select
                    required
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="1">1 personne (solo)</option>
                    <option value="2-3">2-3 personnes</option>
                    <option value="4-5">4-5 personnes</option>
                    <option value="6-10">6-10 personnes</option>
                    <option value="10+">Plus de 10 personnes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Biographie du fondateur *</label>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={formData.founderBio}
                  onChange={(e) => setFormData({ ...formData, founderBio: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Parlez-nous de votre parcours, vos compétences et votre motivation..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-information-line text-blue-600 text-xl flex-shrink-0 mt-0.5"></i>
                  <p className="text-sm text-blue-800">
                    Si vous avez une équipe, vous pourrez ajouter les autres membres après la soumission initiale.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Étape 4: Financement */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Besoins en financement</h2>
                <p className="text-gray-600">Indiquez vos besoins financiers pour développer votre projet.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant recherché (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.fundingGoal}
                    onChange={(e) => setFormData({ ...formData, fundingGoal: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="Ex: 10000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de financement *</label>
                  <select
                    required
                    value={formData.fundingType}
                    onChange={(e) => setFormData({ ...formData, fundingType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Sélectionnez un type</option>
                    <option value="don">Don / Subvention</option>
                    <option value="pret">Prêt</option>
                    <option value="equity">Prise de participation (Equity)</option>
                    <option value="mixte">Mixte</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Financement actuel (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.currentFunding}
                  onChange={(e) => setFormData({ ...formData, currentFunding: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  placeholder="Montant déjà levé ou investi (si applicable)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Utilisation des fonds *</label>
                <textarea
                  required
                  rows={5}
                  maxLength={500}
                  value={formData.useOfFunds}
                  onChange={(e) => setFormData({ ...formData, useOfFunds: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Comment allez-vous utiliser les fonds ? (Ex: Développement technologique 40%, Marketing 30%, Opérations 20%, Équipe 10%)"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-lightbulb-line text-green-600 text-xl flex-shrink-0 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-green-900 mb-1">Conseil</p>
                    <p className="text-sm text-green-800">
                      Soyez réaliste et précis dans vos besoins financiers. Expliquez clairement comment chaque franc sera utilisé pour maximiser vos chances d'obtenir un financement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 5: Documents */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Documents du projet</h2>
                <p className="text-gray-600">Téléchargez les documents qui appuient votre candidature.</p>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-teal-500 transition-colors">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center">
                      <i className="ri-file-text-line text-4xl text-gray-400 mb-2"></i>
                      <span className="text-sm font-medium text-gray-700 mb-1">Business Plan</span>
                      <span className="text-xs text-gray-500">PDF, max 10 MB (optionnel)</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setFormData({ ...formData, businessPlan: e.target.files?.[0]?.name || null })}
                    />
                  </label>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-teal-500 transition-colors">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center">
                      <i className="ri-slideshow-line text-4xl text-gray-400 mb-2"></i>
                      <span className="text-sm font-medium text-gray-700 mb-1">Pitch Deck</span>
                      <span className="text-xs text-gray-500">PDF ou PPT, max 10 MB (optionnel)</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx"
                      className="hidden"
                      onChange={(e) => setFormData({ ...formData, pitchDeck: e.target.files?.[0]?.name || null })}
                    />
                  </label>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-teal-500 transition-colors">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center">
                      <i className="ri-file-excel-line text-4xl text-gray-400 mb-2"></i>
                      <span className="text-sm font-medium text-gray-700 mb-1">Projections financières</span>
                      <span className="text-xs text-gray-500">Excel ou PDF, max 5 MB (optionnel)</span>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.pdf"
                      className="hidden"
                      onChange={(e) => setFormData({ ...formData, financialProjections: e.target.files?.[0]?.name || null })}
                    />
                  </label>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-information-line text-yellow-600 text-xl flex-shrink-0 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">Note importante</p>
                    <p className="text-sm text-yellow-800">
                      Les documents sont optionnels mais fortement recommandés. Ils augmentent significativement vos chances d'être sélectionné pour notre programme d'incubation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-3">Prochaines étapes</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <i className="ri-check-line text-teal-600 mt-0.5"></i>
                    <span>Examen de votre dossier par notre comité (48h)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <i className="ri-check-line text-teal-600 mt-0.5"></i>
                    <span>Entretien avec notre équipe si votre projet est présélectionné</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <i className="ri-check-line text-teal-600 mt-0.5"></i>
                    <span>Décision finale et intégration au programme d'incubation</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Précédent
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap"
              >
                Suivant
                <i className="ri-arrow-right-line ml-2"></i>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-blue-700 transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <i className="ri-send-plane-line mr-2"></i>
                {isSubmitting ? 'Soumission...' : 'Soumettre mon projet'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
