import { createClient } from '@supabase/supabase-js'

// Database types (matching Prisma schema)
export interface UserInfo {
  id?: string
  name: string
  email: string
  linkedin_url?: string
  created_at?: string
}

export interface QuizAttempt {
  id?: string
  user_id: string
  score: number
  total_questions: number
  time_taken: number
  answers: QuizAnswer[]
  score_percentage: number
  category_scores?: {[category: string]: {correct: number, total: number}}
  completed_at?: string
}

export interface QuizAnswer {
  question_id: number
  selected_answer: string
  is_correct: boolean | null
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client only if we have valid credentials
export const supabase = (() => {
  try {
    if (supabaseUrl && supabaseAnonKey && 
        supabaseUrl.startsWith('http') && 
        supabaseAnonKey.startsWith('eyJ')) {
      return createClient(supabaseUrl, supabaseAnonKey)
    }
    return null
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error)
    return null
  }
})()

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey)
}

// Database operations using Supabase
export const supabaseDb = {
  async createUser(userData: Omit<UserInfo, 'id' | 'created_at'>) {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [{ id: 'mock-user-id' }], error: null }
    }

    const { data, error } = await supabase
      .from('users')
      .upsert({
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

    // Optimized insert without .select() for faster performance
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: attemptData.user_id,
        score: attemptData.score,
        total_questions: attemptData.total_questions,
        time_taken: attemptData.time_taken,
        answers: attemptData.answers,
        score_percentage: attemptData.score_percentage,
        category_scores: attemptData.category_scores,
      })

    return { data, error }
  },

  async getUserByEmail(email: string) {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: null, error: null }
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    return { data, error }
  },

  async getQuizAttemptsByUserId(userId: string) {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })

    return { data, error }
  },

  async getAllQuizAttempts() {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        user:users(*)
      `)
      .order('completed_at', { ascending: false })

    return { data, error }
  },

  async getAllUsers() {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  },

  async getAllQuizQuestions() {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data')
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('id', { ascending: true })

    return { data, error }
  }
}