export interface FormateurCommunityCourse {
  id: string | number;
  title: string;
}

export interface FormateurCommunityComment {
  id: string;
  course_id: string | number;
  lesson_id: string | number;
  section_id?: string | number | null;
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

export interface FormateurCommunityFaq {
  id: string;
  course_id: string | number;
  course_name?: string | null;
  question: string;
  answer: string;
  status: 'draft' | 'published' | 'archived';
  position: number;
  instructor_id?: string | null;
}

export interface FormateurCommunitySnapshot {
  courses: FormateurCommunityCourse[];
  comments: FormateurCommunityComment[];
  faqs: FormateurCommunityFaq[];
}
