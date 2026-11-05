import type { CourseStudio } from '../useCourseStudio';
import { ListEditor } from '../StudioFields';
import { RECOMMENDED_OBJECTIVES, type StudioCourse } from '../studioModel';
import { PanelHeader } from './PanelHeader';

export default function IntendedLearnersPanel({ studio, course }: { studio: CourseStudio; course: StudioCourse }) {
  return (
    <div className="space-y-10">
      <PanelHeader
        title="Apprenants cibles"
        description="Ces informations apparaissent sur la page de votre cours. Elles aident les apprenants à savoir si le cours est fait pour eux, et l'équipe C2P à le valider plus vite."
      />
      <ListEditor
        title="Que vont apprendre les apprenants dans votre cours ?"
        description={`Indiquez au moins ${RECOMMENDED_OBJECTIVES} objectifs ou résultats concrets que les apprenants pourront atteindre à la fin du cours.`}
        items={course.objectives}
        minRows={RECOMMENDED_OBJECTIVES}
        placeholders={[
          'Exemple : créer un tableau de bord de suivi des ventes',
          'Exemple : calculer et présenter une marge commerciale',
          'Exemple : automatiser une tâche répétitive',
          'Exemple : présenter ses résultats avec assurance',
        ]}
        onSave={(objectives) => studio.patchCourse({ objectives })}
      />
      <ListEditor
        title="Quels sont les prérequis pour suivre votre cours ?"
        description="Compétences, expérience, outils ou matériel nécessaires. S'il n'y en a pas, dites-le : c'est un atout pour les débutants."
        items={course.prerequisites}
        placeholders={['Exemple : savoir utiliser un ordinateur et naviguer sur Internet']}
        onSave={(prerequisites) => studio.patchCourse({ prerequisites })}
      />
      <ListEditor
        title="À qui ce cours s'adresse-t-il ?"
        description="Décrivez les apprenants pour qui ce contenu sera le plus utile."
        items={course.target_audience}
        placeholders={['Exemple : commerçants qui veulent mieux suivre leur activité']}
        onSave={(target_audience) => studio.patchCourse({ target_audience })}
      />
    </div>
  );
}
