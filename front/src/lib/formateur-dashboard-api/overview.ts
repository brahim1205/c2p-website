import {
  fetchFinanceSnapshot,
  fetchPayoutAccounts,
  fetchPayoutRequests,
} from '@/lib/saasApi';
import type {
  FormateurDashboardSnapshot,
  FormateurDashboardUser,
  FormateurRevenueSnapshot,
} from '../formateurDashboardTypes';
import { fetchFormateurCourses } from '../formateurCoursesApi';
import { fetchFormateurEvaluations } from './evaluations';
import { fetchFormateurLearners } from './learners';

export async function fetchFormateurDashboardSnapshot(user: FormateurDashboardUser): Promise<FormateurDashboardSnapshot> {
  const [courses, learners, evaluations, finance] = await Promise.all([
    fetchFormateurCourses(user.id),
    fetchFormateurLearners(user.id),
    fetchFormateurEvaluations(user.id),
    fetchFinanceSnapshot(user.id, user.role),
  ]);

  return {
    courses,
    students: learners.enrollments,
    exams: evaluations.exams,
    submissions: evaluations.submissions,
    finance,
  };
}

export async function fetchFormateurAnalytics(userId: string) {
  const [courses, learners, evaluations] = await Promise.all([
    fetchFormateurCourses(userId),
    fetchFormateurLearners(userId),
    fetchFormateurEvaluations(userId),
  ]);
  return { courses, enrollments: learners.enrollments, submissions: evaluations.submissions };
}

export async function fetchFormateurRevenueSnapshot(userId: string): Promise<FormateurRevenueSnapshot> {
  const [courses, accounts, requests] = await Promise.all([
    fetchFormateurCourses(userId),
    fetchPayoutAccounts(userId),
    fetchPayoutRequests(userId),
  ]);

  return {
    courses,
    accounts: accounts || [],
    requests: requests || [],
  };
}
