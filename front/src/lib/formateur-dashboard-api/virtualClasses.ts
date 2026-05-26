import { apiRequest } from '@/lib/api';
import type { FormateurVirtualClass, FormateurVirtualClassesSnapshot } from '../formateurDashboardTypes';

export async function fetchFormateurVirtualClasses(userId: string): Promise<FormateurVirtualClassesSnapshot> {
  void userId;
  return apiRequest<FormateurVirtualClassesSnapshot>('/learning/formateur/virtual-classes');
}

export async function updateFormateurVirtualClassStatus(userId: string, classId: string | number, status: string) {
  void userId;
  return apiRequest<FormateurVirtualClass>(
    `/learning/formateur/virtual-classes/${encodeURIComponent(String(classId))}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}

export async function createFormateurVirtualClass(userId: string, payload: {
  course_id: string | number;
  title: string;
  course_name: string;
  class_date: string;
  class_time: string;
  duration: string;
  max_students: number;
  provider: 'jitsi' | 'custom';
  meeting_slug: string;
  room_link: string;
  recording_enabled: boolean;
  recording_url: string;
  instructor_notes: string;
  allow_chat: boolean;
}) {
  void userId;
  return apiRequest<FormateurVirtualClass>('/learning/formateur/virtual-classes', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      duration: payload.duration || null,
      max_students: payload.max_students || 30,
      meeting_slug: payload.meeting_slug || null,
      room_link: payload.room_link || null,
      recording_url: payload.recording_url || null,
      instructor_notes: payload.instructor_notes || null,
      status: 'scheduled',
    }),
  });
}

export async function updateFormateurVirtualClass(userId: string, classId: string | number, payload: Record<string, unknown>) {
  void userId;
  return apiRequest<FormateurVirtualClass>(
    `/learning/formateur/virtual-classes/${encodeURIComponent(String(classId))}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteFormateurVirtualClass(userId: string, classId: string | number) {
  void userId;
  return apiRequest<FormateurVirtualClass>(
    `/learning/formateur/virtual-classes/${encodeURIComponent(String(classId))}`,
    { method: 'DELETE' },
  );
}
