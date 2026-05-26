import { DEFAULT_CLASS_FORM, type ClassFormErrors, type VirtualClass } from './virtualClassModel';

export type VirtualClassForm = typeof DEFAULT_CLASS_FORM;

export interface InstructorCourseOption {
  id: string | number;
  title: string;
}

export interface VirtualClassCreateFormProps {
  newClass: VirtualClassForm;
  errors: ClassFormErrors;
  formMessage: string | null;
  instructorCourses: InstructorCourseOption[];
  onUpdateClass: <K extends keyof VirtualClassForm>(field: K, value: VirtualClassForm[K]) => void;
  onSelectCourse: (courseId: string) => void;
}

export interface VirtualClassEditFormProps {
  editForm: Partial<VirtualClass>;
  errors: ClassFormErrors;
  formMessage: string | null;
  instructorCourses: InstructorCourseOption[];
  onUpdateForm: <K extends keyof VirtualClass>(field: K, value: VirtualClass[K] | undefined) => void;
  onSelectCourse: (courseId: string) => void;
}
