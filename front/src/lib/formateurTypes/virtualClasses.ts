export interface FormateurVirtualClass {
  id: string | number;
  course_id: string | number | null;
  title: string;
  course_name: string | null;
  class_date: string;
  class_time: string;
  duration: string | null;
  students_count: number;
  max_students: number;
  status: string;
  provider?: 'jitsi' | 'custom';
  meeting_slug?: string | null;
  recording_enabled?: boolean;
  recording_status?: 'none' | 'pending' | 'processing' | 'ready';
  recording_url: string | null;
  room_link: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  instructor_notes?: string | null;
  allow_chat?: boolean;
  created_at: string;
  instructor_id?: string | null;
}

export interface FormateurVirtualClassesSnapshot {
  classes: FormateurVirtualClass[];
  courses: Array<{ id: string | number; title: string }>;
}
