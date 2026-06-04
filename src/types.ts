export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'free' | 'pro' | 'premium';
  createdAt: string;
  username?: string;
  role?: 'user' | 'admin';
  aiMessageCount?: number;
  maxAiMessages?: number;
  imageGenCount?: number;
  maxImageGens?: number;
  memories?: Memory[];
  projects?: Project[];
  studentData?: StudentData;
  creatorDrafts?: CreatorStudioDraft[];
  savedLetters?: SavedLetter[];
}

export interface Memory {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  pinned?: boolean;
}

export interface ProjectDocument {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'document' | 'research';
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  dueDate?: string;
  createdAt: string;
}

export interface ProjectImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  documents: ProjectDocument[];
  tasks: ProjectTask[];
  images: ProjectImage[];
  createdAt: string;
}

export interface StudentExam {
  id: string;
  subject: string;
  date: string;
  topic: string;
  gradeGoal?: string;
}

export interface StudentFlashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface StudentRevision {
  id: string;
  subject: string;
  durationMinutes: number;
  completed: boolean;
  date: string;
}

export interface StudentQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudentData {
  exams: StudentExam[];
  flashcards: StudentFlashcard[];
  revisions: StudentRevision[];
}

export interface CreatorStudioDraft {
  id: string;
  idea: string;
  outputs: {
    youtubeScript?: string;
    instagramCaption?: string;
    adCopy?: string;
    blogArticle?: string;
    productDescription?: string;
    emailDraft?: string;
    hashtags?: string[];
  };
  branding: string;
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'code' | 'image';
  imageUrl?: string;
  codeLanguage?: string;
  searchResults?: Array<{ title: string; uri: string }>;
  metadata?: {
    cost?: string;
    speed?: string;
    modelName?: string;
    isRegenerated?: boolean;
    intent?: string;
    confidence?: string;
    tokens?: number;
    emotion?: string;
    detectedMood?: string;
    emotionalDirective?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ImageSnippet {
  id: string;
  url: string;
  prompt: string;
  timestamp: string;
  aspectRatio: string;
}

export interface VoiceState {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  text: string;
}

export interface SavedLetter {
  id: string;
  type: string; // school_leave, resignation, complain, etc.
  inputs: {
    name: string;
    receiver: string;
    entityName: string; // School/Company Name
    reason: string;
    date: string;
    duration: string;
    additional?: string;
  };
  outputs: {
    formal: string;
    professional: string;
    short: string;
    detailed: string;
  };
  language: 'en' | 'hi' | 'hinglish';
  templateType: 'student' | 'teacher' | 'employee' | 'business';
  aiSuggestions: string[];
  createdAt: string;
}

