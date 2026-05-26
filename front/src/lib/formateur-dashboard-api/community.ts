import { apiRequest } from '@/lib/api';
import type {
  FormateurCommunityComment,
  FormateurCommunityFaq,
  FormateurCommunitySnapshot,
} from '../formateurDashboardTypes';

export async function fetchFormateurCommunity(userId: string): Promise<FormateurCommunitySnapshot> {
  void userId;
  return apiRequest<FormateurCommunitySnapshot>('/learning/formateur/community');
}

export async function moderateFormateurCommunityComment(userId: string, commentId: string, patch: Partial<FormateurCommunityComment>) {
  void userId;
  return apiRequest<FormateurCommunityComment>(
    `/learning/formateur/community/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
}

export async function replyToFormateurCommunityComment(userId: string, commentId: string, content: string) {
  void userId;
  return apiRequest<FormateurCommunityComment>(
    `/learning/formateur/community/comments/${encodeURIComponent(commentId)}/replies`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  );
}

export async function createFormateurFaq(userId: string, payload: {
  course_id: string | number;
  question: string;
  answer: string;
  status: FormateurCommunityFaq['status'];
}) {
  void userId;
  return apiRequest<FormateurCommunityFaq>('/learning/formateur/community/faqs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFormateurFaqStatus(userId: string, faqId: string, status: FormateurCommunityFaq['status']) {
  void userId;
  return apiRequest<FormateurCommunityFaq>(
    `/learning/formateur/community/faqs/${encodeURIComponent(faqId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}
