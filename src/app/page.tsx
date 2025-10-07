'use client'

import { useState, useEffect } from 'react'
import UserInfoForm from '@/components/UserInfoForm'
import QuizComponent from '@/components/QuizComponent'
import ResultsComponent from '@/components/ResultsComponent'
import { UserInfo, QuizAttempt } from '@/lib/supabase'

type QuizState = 'user-info' | 'quiz' | 'results'

export default function Home() {
  const [currentState, setCurrentState] = useState<QuizState>('user-info')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleUserInfoSubmit = (info: UserInfo) => {
    setUserInfo(info)
    setCurrentState('quiz')
  }

  const handleQuizComplete = (attempt: QuizAttempt) => {
    setQuizAttempt(attempt)
    setCurrentState('results')
  }

  const handleRestart = () => {
    setUserInfo(null)
    setQuizAttempt(null)
    setCurrentState('user-info')
  }

  // Prevent hydration mismatch by not rendering until client is ready
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4 w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 to-yellow-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">
              Golden Prints Quiz
            </h1>
            <p className="text-amber-100 text-lg">
              Test Your Knowledge • 50 Questions • 18 Minutes
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentState === 'user-info' && (
          <UserInfoForm onSubmit={handleUserInfoSubmit} />
        )}
        
        {currentState === 'quiz' && userInfo && (
          <QuizComponent 
            userInfo={userInfo} 
            onComplete={handleQuizComplete}
          />
        )}
        
        {currentState === 'results' && userInfo && quizAttempt && (
          <ResultsComponent 
            userInfo={userInfo}
            quizAttempt={quizAttempt}
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300">
            © 2024 Golden Prints. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}