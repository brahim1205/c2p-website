export interface CommunityCourse {
  id: string | number;
  title: string;
}

export interface CommunityComment {
  id: string;
  course_id: string | number;
  lesson_id: string | number;
  lesson_title?: string | null;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  status: 'visible' | 'hidden';
  likes: number;
  pinned: boolean;
  parent_id?: string | null;
  created_at: string;
}

export interface CommunityFaq {
  id: string;
  course_id: string | number;
  course_name?: string | null;
  question: string;
  answer: string;
  status: 'draft' | 'published' | 'archived';
  position: number;
}

export interface CommunitySnapshot {
  courses?: CommunityCourse[];
  comments?: CommunityComment[];
  faqs?: CommunityFaq[];
}

export type CommunityTab = 'comments' | 'faq';
export type CommunityCourseFilter = 'all' | string;

export function filterCommunityComments(comments: CommunityComment[], courseFilter: CommunityCourseFilter) {
  return comments.filter((comment) => courseFilter === 'all' || String(comment.course_id) === courseFilter);
}

export function filterCommunityFaqs(faqs: CommunityFaq[], courseFilter: CommunityCourseFilter) {
  return faqs.filter((faq) => courseFilter === 'all' || String(faq.course_id) === courseFilter);
}

export function splitCommunityThreads(comments: CommunityComment[]) {
  return {
    rootComments: comments.filter((comment) => !comment.parent_id),
    repliesByParent: comments.reduce<Record<string, CommunityComment[]>>((accumulator, comment) => {
      if (!comment.parent_id) return accumulator;
      if (!accumulator[comment.parent_id]) {
        accumulator[comment.parent_id] = [];
      }
      accumulator[comment.parent_id].push(comment);
      return accumulator;
    }, {}),
  };
}

export function resolveFaqCourseName(faq: CommunityFaq, courses: CommunityCourse[]) {
  return faq.course_name || courses.find((course) => String(course.id) === String(faq.course_id))?.title || 'Cours';
}
