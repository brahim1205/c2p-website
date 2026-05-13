import { backendClient } from './backendClient';

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  relationship?: string | null;
  status?: string | null;
  alert_channel?: string | null;
  created_at?: string | null;
}

export interface ParentEnrollmentCourse {
  id: number;
  title?: string | null;
  category?: string | null;
  duration?: string | null;
  delivery_mode?: string | null;
  program_branch?: string | null;
}

export interface ParentEnrollment {
  id: number;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  course_id: number;
  progress: number;
  grade?: number | null;
  status?: string | null;
  last_active?: string | null;
  enrolled_at?: string | null;
  courses?: ParentEnrollmentCourse | null;
}

export interface ParentCertificate {
  id: number;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  course_id: number;
  course_name?: string | null;
  title?: string | null;
  grade?: number | null;
  status?: string | null;
  issued_at?: string | null;
  completion_date?: string | null;
}

function throwApiError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message || 'Backend request failed.');
  }
}

export async function fetchParentDashboardSnapshot(userId: string) {
  const linksRes = await backendClient
    .from<ParentStudentLink>('student_guardians')
    .select('*')
    .eq('parent_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  throwApiError(linksRes.error);

  const links = (linksRes.data as ParentStudentLink[]) || [];
  const studentIds = Array.from(new Set(links.map((link) => link.student_id).filter(Boolean)));

  if (studentIds.length === 0) {
    return {
      links,
      enrollments: [] as ParentEnrollment[],
      certificates: [] as ParentCertificate[],
    };
  }

  const [enrollmentsRes, certificatesRes] = await Promise.all([
    backendClient
      .from<ParentEnrollment>('course_enrollments')
      .select('*')
      .in('student_id', studentIds)
      .order('last_active', { ascending: false }),
    backendClient
      .from<ParentCertificate>('certificates')
      .select('*')
      .in('student_id', studentIds)
      .order('issued_at', { ascending: false }),
  ]);

  throwApiError(enrollmentsRes.error);
  throwApiError(certificatesRes.error);

  return {
    links,
    enrollments: (enrollmentsRes.data as ParentEnrollment[]) || [],
    certificates: (certificatesRes.data as ParentCertificate[]) || [],
  };
}
