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
  description: string;
  chapters?: Chapter[];
  thumbnail?: string;
}

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

export interface Resource {
  id: number;
  title: string;
  type: string;
  size: string;
  icon: string;
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
  resources: Resource[];
  comments: Comment[];
}
