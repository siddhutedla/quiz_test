import { createClient } from '@supabase/supabase-js'
import type { GradedAnswer, SectionScore, TimingSummary, Grade } from '@/lib/grading'

// Row types (snake_case, matching the Supabase tables)
export interface UserInfo {
  id?: string
  name: string
  email: string
  linkedin_url?: string
  created_at?: string
}

export interface QuizQuestionRow {
  id: number
  section: string
  question: string
  options: Record<string, string> // { A: '...', B: '...', C: '...', D: '...' }
  correct_answer: string
  ideal_time_sec: number
  max_time_sec: number
  created_at?: string
}

export interface QuizAttempt {
  id?: string
  user_id: string
  score: number
  total_questions: number
  time_taken: number
  answers: GradedAnswer[]
  score_percentage: number
  timing_score: number
  weighted_score: number
  grade: Grade
  section_scores: Record<string, SectionScore>
  timing_summary: TimingSummary
  completed_at?: string
}

export type QuizAttemptWithUser = QuizAttempt & { id: string; completed_at: string; user: UserInfo | null }

// Initialize Supabase client
// Supabase's dashboard calls the key PUBLISHABLE_KEY; older setups call it ANON_KEY. Accept both.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = (() => {
  try {
    if (supabaseUrl && supabaseAnonKey &&
        supabaseUrl.startsWith('http') &&
        supabaseAnonKey.length > 20) {
      return createClient(supabaseUrl, supabaseAnonKey)
    }
    return null
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error)
    return null
  }
})()

export const isSupabaseConfigured = () => !!supabase

// Database operations using Supabase
export const supabaseDb = {
  async createUser(userData: Omit<UserInfo, 'id' | 'created_at'>) {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [{ id: 'mock-user-id' }], error: null }
    }

    // Reuse an existing user with the same email
    const { data: existingUser } = await supabase
      .from('quiz_candidates')
      .select('*')
      .eq('email', userData.email)
      .maybeSingle()

    if (existingUser) {
      return { data: [existingUser], error: null }
    }

    const { data, error } = await supabase
      .from('quiz_candidates')
      .insert({
        name: userData.name,
        email: userData.email,
        linkedin_url: userData.linkedin_url,
      })
      .select()

    return { data, error }
  },

  async createQuizAttempt(attemptData: Omit<QuizAttempt, 'id' | 'completed_at'>) {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: null, error: null }
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: attemptData.user_id,
        score: attemptData.score,
        total_questions: attemptData.total_questions,
        time_taken: attemptData.time_taken,
        answers: attemptData.answers,
        score_percentage: attemptData.score_percentage,
        timing_score: attemptData.timing_score,
        weighted_score: attemptData.weighted_score,
        grade: attemptData.grade,
        section_scores: attemptData.section_scores,
        timing_summary: attemptData.timing_summary,
      })

    return { data, error }
  },

  async getAllQuizAttempts() {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [] as QuizAttemptWithUser[], error: null }
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`*, user:quiz_candidates(*)`)
      .order('completed_at', { ascending: false })

    return { data: (data ?? []) as QuizAttemptWithUser[], error }
  },

  async getAllUsers() {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [] as UserInfo[], error: null }
    }

    const { data, error } = await supabase
      .from('quiz_candidates')
      .select('*')
      .order('created_at', { ascending: false })

    return { data: (data ?? []) as UserInfo[], error }
  },

  async getAllQuizQuestions() {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [] as QuizQuestionRow[], error: null }
    }

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('id', { ascending: true })

    return { data: (data ?? []) as QuizQuestionRow[], error }
  }
}
