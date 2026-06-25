export interface Chapter {
  time: number;
  label: string;
}

export interface Lesson {
  id: number;
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'reading' | 'exercise';
  completed: boolean;
  bookmarked?: boolean;
  note?: string;
  videoPositionSeconds?: number;
  lastViewedAt?: string;
  description: string;
  chapters?: Chapter[];
  thumbnail?: string;
  videoUrl?: string;
  quizRequired?: boolean;
  contentBlocks?: LessonContentBlock[];
  resources?: Resource[];
}

export type LessonContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; tone: 'warning' | 'info'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] };

export interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QuizAttempt {
  id?: number | string;
  date: string;
  score: number;
  total: number;
  answers: Record<string, number>;
}

export interface Resource {
  id: number;
  title: string;
  type: string;
  size: string;
  icon: string;
  url?: string;
  thumbnailUrl?: string;
  mimeType?: string;
}

export interface Comment {
  id: number;
  user: string;
  avatar: string;
  content: string;
  date: string;
  likes: number;
}

export interface Course {
  id: number;
  title: string;
  instructor: string;
  instructorAvatar: string;
  category: string;
  level: string;
  duration: string;
  thumbnail: string;
  description: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  modules: Module[];
  quiz: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  resources: Resource[];
  comments: Comment[];
}
