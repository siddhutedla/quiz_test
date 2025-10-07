import { PrismaClient, Prisma } from '@prisma/client'

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined
}

// Create a singleton Prisma client only if DATABASE_URL is available
const prisma = (() => {
  try {
    if (!globalThis.__prisma && process.env.DATABASE_URL) {
      return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    }
    return globalThis.__prisma
  } catch (error) {
    console.warn('Failed to initialize Prisma client:', error)
    return null
  }
})()

// In development, save the client to the global variable to prevent multiple instances
if (process.env.NODE_ENV !== 'production' && prisma) {
  globalThis.__prisma = prisma
}

export { prisma }

// Database types matching our Prisma schema
export interface User {
  id: string
  name: string
  email: string
  linkedinUrl?: string
  createdAt: Date
}

export interface QuizAttempt {
  id: string
  userId: string
  score: number
  totalQuestions: number
  timeTaken: number
  answers: QuizAnswer[]
  scorePercentage: number
  categoryScores?: { [category: string]: { correct: number; total: number } }
  completedAt: Date
}

export interface QuizAnswer {
  questionId: number
  selectedAnswer: string
  isCorrect: boolean | null
}

export interface QuizQuestion {
  id: number
  question: string
  options?: string[]
  correctAnswer?: string
  category?: string
  difficulty: string
  type: string
  maxLength?: number
  createdAt: Date
}

// Database operations
export const db = {
  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt'>) {
    if (!prisma) {
      console.warn('Prisma client not available, returning mock data')
      return { id: 'mock-user-id', ...userData, createdAt: new Date() }
    }
    
    return await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        linkedinUrl: userData.linkedinUrl,
      },
    })
  },

  async getUserByEmail(email: string) {
    if (!prisma) {
      console.warn('Prisma client not available')
      return null
    }
    
    return await prisma.user.findUnique({
      where: { email },
    })
  },

  async getUserById(id: string) {
    if (!prisma) {
      console.warn('Prisma client not available')
      return null
    }
    
    return await prisma.user.findUnique({
      where: { id },
    })
  },

  // Quiz attempt operations
  async createQuizAttempt(attemptData: Omit<QuizAttempt, 'id' | 'completedAt'>) {
    if (!prisma) {
      console.warn('Prisma client not available, returning mock data')
      return { id: 'mock-attempt-id', ...attemptData, completedAt: new Date() }
    }
    
    return await prisma.quizAttempt.create({
      data: {
        userId: attemptData.userId,
        score: attemptData.score,
        totalQuestions: attemptData.totalQuestions,
        timeTaken: attemptData.timeTaken,
        answers: attemptData.answers as unknown as Prisma.InputJsonValue,
        scorePercentage: attemptData.scorePercentage,
        categoryScores: attemptData.categoryScores as unknown as Prisma.InputJsonValue,
      },
    })
  },

  async getQuizAttemptsByUserId(userId: string) {
    if (!prisma) {
      console.warn('Prisma client not available')
      return []
    }
    
    return await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    })
  },

  async getAllQuizAttempts() {
    if (!prisma) {
      console.warn('Prisma client not available')
      return []
    }
    
    return await prisma.quizAttempt.findMany({
      include: {
        user: true,
      },
      orderBy: { completedAt: 'desc' },
    })
  },

  // Quiz question operations (for future use)
  async createQuizQuestion(questionData: Omit<QuizQuestion, 'id' | 'createdAt'>) {
    if (!prisma) {
      console.warn('Prisma client not available')
      return null
    }
    
    return await prisma.quizQuestion.create({
      data: questionData,
    })
  },

  async getAllQuizQuestions() {
    if (!prisma) {
      console.warn('Prisma client not available')
      return []
    }
    
    return await prisma.quizQuestion.findMany({
      orderBy: { id: 'asc' },
    })
  },

  // Analytics operations
  async getQuizStatistics() {
    if (!prisma) {
      console.warn('Prisma client not available')
      return { totalAttempts: 0, averageScore: 0, totalUsers: 0 }
    }
    
    const totalAttempts = await prisma.quizAttempt.count()
    const avgScore = await prisma.quizAttempt.aggregate({
      _avg: {
        scorePercentage: true,
      },
    })
    const totalUsers = await prisma.user.count()

    return {
      totalAttempts,
      averageScore: avgScore._avg.scorePercentage || 0,
      totalUsers,
    }
  },

  async getCategoryAnalytics() {
    if (!prisma) {
      console.warn('Prisma client not available')
      return { attempts: [] }
    }
    
    // This would need to be implemented based on your specific needs
    // For now, return basic stats
    const attempts = await prisma.quizAttempt.findMany({
      select: {
        categoryScores: true,
        scorePercentage: true,
      },
    })

    return {
      attempts,
      // Add more analytics as needed
    }
  },
}
