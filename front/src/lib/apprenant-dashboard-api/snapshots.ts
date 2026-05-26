import { apiRequest } from '../api';
import type { ApprenantCertificate, ApprenantEnrollment, ApprenantExam, ApprenantSubmission } from './types';

export async function fetchApprenantDashboardSnapshot(userId: string) {
  void userId;
  return apiRequest<{ enrollments: ApprenantEnrollment[]; certificates: ApprenantCertificate[] }>('/learning/apprenant/dashboard');
}

export async function fetchApprenantProgressionSnapshot(userId: string) {
  void userId;
  return apiRequest<{
    enrollments: ApprenantEnrollment[];
    certificates: ApprenantCertificate[];
    submissions: ApprenantSubmission[];
  }>('/learning/apprenant/progression');
}

export async function fetchApprenantExamensSnapshot(userId: string) {
  void userId;
  return apiRequest<{ exams: ApprenantExam[]; submissions: ApprenantSubmission[] }>('/learning/apprenant/exams');
}
