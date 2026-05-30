import VirtualClassCreateForm from './VirtualClassCreateForm';
import VirtualClassEditForm from './VirtualClassEditForm';
import type {
  InstructorCourseOption,
  VirtualClassEditFormProps,
  VirtualClassForm,
} from './virtualClassFormTypes';
import type { ClassFormErrors } from './virtualClassModel';

interface VirtualClassCreateModalProps {
  newClass: VirtualClassForm;
  errors: ClassFormErrors;
  formMessage: string | null;
  instructorCourses: InstructorCourseOption[];
  isCreating: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onUpdateClass: <K extends keyof VirtualClassForm>(field: K, value: VirtualClassForm[K]) => void;
  onSelectCourse: (courseId: string) => void;
}

interface VirtualClassEditModalProps extends VirtualClassEditFormProps {
  isUpdating: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function VirtualClassCreateModal({
  newClass,
  errors,
  formMessage,
  instructorCourses,
  isCreating,
  onClose,
  onSubmit,
  onUpdateClass,
  onSelectCourse,
}: VirtualClassCreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Live formateur</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">Programmer une classe virtuelle</h3>
            <p className="mt-1 text-sm text-gray-500">
              Planifiez la session, rattachez-la à une formation et laissez C2P préparer la salle.
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <VirtualClassCreateForm
          newClass={newClass}
          errors={errors}
          formMessage={formMessage}
          instructorCourses={instructorCourses}
          onUpdateClass={onUpdateClass}
          onSelectCourse={onSelectCourse}
        />

        <ModalActions
          onClose={onClose}
          onSubmit={onSubmit}
          disabled={isCreating}
          submitLabel={isCreating ? 'Programmation...' : 'Programmer'}
        />
      </div>
    </div>
  );
}

export function VirtualClassEditModal({
  editForm,
  errors,
  formMessage,
  instructorCourses,
  isUpdating,
  isReplayUploading,
  replayUploadProgress,
  onClose,
  onSubmit,
  onUpdateForm,
  onSelectCourse,
  onReplayFileChange,
}: VirtualClassEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-6 text-lg font-bold text-gray-900">
          {editForm.status === 'ended' ? 'Modifier la classe et le replay' : 'Modifier la classe'}
        </h3>
        <VirtualClassEditForm
          editForm={editForm}
          errors={errors}
          formMessage={formMessage}
          instructorCourses={instructorCourses}
          isReplayUploading={isReplayUploading}
          replayUploadProgress={replayUploadProgress}
          onUpdateForm={onUpdateForm}
          onSelectCourse={onSelectCourse}
          onReplayFileChange={onReplayFileChange}
        />
        <div className="mt-6">
          <ModalActions
            onClose={onClose}
            onSubmit={onSubmit}
            disabled={isUpdating || isReplayUploading}
            submitLabel={isReplayUploading ? 'Upload en cours...' : isUpdating ? 'Enregistrement...' : 'Enregistrer'}
          />
        </div>
      </div>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
      aria-label="Fermer"
    >
      <i className="ri-close-line text-xl"></i>
    </button>
  );
}

function ModalActions({
  onClose,
  onSubmit,
  disabled,
  submitLabel,
}: {
  onClose: () => void;
  onSubmit: () => void;
  disabled: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
      <button
        onClick={onClose}
        disabled={disabled}
        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      >
        Annuler
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}
