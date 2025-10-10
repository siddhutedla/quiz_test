'use client'

import { useState, useEffect } from 'react'
import { supabaseDb } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
  linkedin_url?: string
  created_at: string
}

interface QuizAttempt {
  id: string
  user_id: string
  score: number
  total_questions: number
  time_taken: number
  score_percentage: number
  category_scores?: {[category: string]: {correct: number, total: number}}
  completed_at: string
  answers: Array<{
    question_id: number
    selected_answer: string
    is_correct: boolean | null
  }>
}

interface QuizQuestion {
  id: number
  question: string
  options?: string[]
  correct_answer?: string
  category?: string
  difficulty?: string
  type?: string
  max_length?: number
  created_at?: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([])
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'attempts' | 'questions'>('attempts')
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<QuizQuestion | null>(null)
  const [starredAttempts, setStarredAttempts] = useState<Set<string>>(new Set())
  const [sortByStarred, setSortByStarred] = useState(false)
  const [sendingEmail, setSendingEmail] = useState<Set<string>>(new Set())
  const [emailStatus, setEmailStatus] = useState<{[key: string]: 'success' | 'error'}>({})

  const handleSendEmail = async (attempt: QuizAttempt, user: User | undefined) => {
    if (!user) return
    
    setSendingEmail(prev => new Set(prev).add(attempt.id))
    setEmailStatus(prev => {
      const newStatus = {...prev}
      delete newStatus[attempt.id]
      return newStatus
    })
    
    try {
      const response = await fetch('https://n8n-test-3ndm.onrender.com/webhook/7a0c202f-c430-4d28-a4c1-9b43d300cf39', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId: attempt.id,
          userName: user.name,
          userEmail: user.email,
          linkedinUrl: user.linkedin_url,
          score: attempt.score,
          totalQuestions: attempt.total_questions,
          scorePercentage: attempt.score_percentage,
          timeTaken: attempt.time_taken,
          completedAt: attempt.completed_at,
          categoryScores: attempt.category_scores,
          answers: attempt.answers
        })
      })
      
      if (response.ok) {
        setEmailStatus(prev => ({...prev, [attempt.id]: 'success'}))
        setTimeout(() => {
          setEmailStatus(prev => {
            const newStatus = {...prev}
            delete newStatus[attempt.id]
            return newStatus
          })
        }, 3000)
      } else {
        setEmailStatus(prev => ({...prev, [attempt.id]: 'error'}))
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setEmailStatus(prev => ({...prev, [attempt.id]: 'error'}))
    } finally {
      setSendingEmail(prev => {
        const newSet = new Set(prev)
        newSet.delete(attempt.id)
        return newSet
      })
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
      // Load starred items from localStorage
      const saved = localStorage.getItem('starredAttempts')
      if (saved) {
        setStarredAttempts(new Set(JSON.parse(saved)))
      }
    }
  }, [isAuthenticated])

  const toggleStar = (attemptId: string) => {
    setStarredAttempts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(attemptId)) {
        newSet.delete(attemptId)
      } else {
        newSet.add(attemptId)
      }
      // Save to localStorage
      localStorage.setItem('starredAttempts', JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  const getSortedAttempts = () => {
    if (!sortByStarred) {
      return quizAttempts
    }
    return [...quizAttempts].sort((a, b) => {
      const aStarred = starredAttempts.has(a.id)
      const bStarred = starredAttempts.has(b.id)
      if (aStarred && !bStarred) return -1
      if (!aStarred && bStarred) return 1
      return 0
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'password') {
      setIsAuthenticated(true)
      setPasswordError('')
    } else {
      setPasswordError('Incorrect password')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load users
      const usersResponse = await supabaseDb.getAllUsers()
      if (usersResponse.data) {
        setUsers(usersResponse.data)
      }
      
      // Load quiz attempts
      const attemptsResponse = await supabaseDb.getAllQuizAttempts()
      if (attemptsResponse.data) {
        setQuizAttempts(attemptsResponse.data)
      }
      
      // Load quiz questions
      const questionsResponse = await supabaseDb.getAllQuizQuestions()
      if (questionsResponse.data) {
        setQuizQuestions(questionsResponse.data)
      }
      
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50'
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getQuestionAnswers = (questionId: number) => {
    return quizAttempts.flatMap(attempt => 
      attempt.answers
        .filter(answer => answer.question_id === questionId)
        .map(answer => ({
          ...answer,
          user: users.find(u => u.id === attempt.user_id),
          attempt_date: attempt.completed_at,
          attempt_score: attempt.score_percentage
        }))
    )
  }

  // Password prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h1>
            <p className="text-gray-600">Enter password to access admin dashboard</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-1">{passwordError}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-amber-500 text-white py-2 px-4 rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
              Access Admin Dashboard
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quiz Submissions</h1>
            <p className="text-gray-600 mt-1">View all quiz attempts and detailed answers</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={loadData}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Refresh Data
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'attempts', name: 'Quiz Submissions', count: quizAttempts.length },
              { id: 'questions', name: 'Questions', count: quizQuestions.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'attempts' | 'questions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'attempts' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">All Quiz Attempts</h2>
              <button
                onClick={() => setSortByStarred(!sortByStarred)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  sortByStarred 
                    ? 'bg-amber-500 text-white hover:bg-amber-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {sortByStarred ? '⭐ Showing Starred First' : 'Show Starred First'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Star</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LinkedIn</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedAttempts().map((attempt) => {
                    const user = users.find(u => u.id === attempt.user_id)
                    const isStarred = starredAttempts.has(attempt.id)
                    return (
                      <tr key={attempt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleStar(attempt.id)}
                            className="text-2xl hover:scale-110 transition-transform"
                          >
                            {isStarred ? '⭐' : '☆'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user?.name || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user?.email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user?.linkedin_url ? (
                            <a 
                              href={user.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View Profile
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">Not provided</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${getScoreColor(attempt.score_percentage)}`}>
                            {attempt.score}/{attempt.total_questions} ({attempt.score_percentage.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(attempt.time_taken)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(attempt.completed_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => setSelectedAttempt(attempt)}
                              className="text-amber-600 hover:text-amber-900 whitespace-nowrap text-left"
                            >
                              View Answers
                            </button>
                            <button
                              onClick={() => handleSendEmail(attempt, user)}
                              disabled={sendingEmail.has(attempt.id)}
                              className={`whitespace-nowrap text-left ${
                                emailStatus[attempt.id] === 'success' 
                                  ? 'text-green-600 hover:text-green-900' 
                                  : emailStatus[attempt.id] === 'error'
                                  ? 'text-red-600 hover:text-red-900'
                                  : 'text-blue-600 hover:text-blue-900'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {sendingEmail.has(attempt.id) 
                                ? '⏳ Sending...' 
                                : emailStatus[attempt.id] === 'success'
                                ? '✓ Email Sent'
                                : emailStatus[attempt.id] === 'error'
                                ? '✗ Failed'
                                : '📧 Send Email'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quiz Questions ({quizQuestions.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        <div className="text-center">
                          <p className="text-lg font-medium">No questions found in database</p>
                          <p className="mt-2">Questions are currently hardcoded in QuizComponent.tsx</p>
                          <p className="mt-1 text-sm">To manage questions in the database, populate the quiz_questions table</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    quizQuestions.map((question) => (
                      <tr key={question.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {question.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md truncate">
                            {question.question}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {question.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            question.type === 'multiple_choice' ? 'bg-green-100 text-green-800' :
                            question.type === 'short_answer' ? 'bg-yellow-100 text-yellow-800' :
                            question.type === 'long_answer' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {question.type || 'multiple_choice'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            question.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {question.difficulty || 'medium'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => setSelectedQuestion(question)}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            View Answers ({getQuestionAnswers(question.id).length})
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Attempt Details Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Quiz Attempt Details</h3>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <h4 className="font-medium text-gray-900 mb-4">Attempt Summary</h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Score</dt>
                      <dd className={`text-lg font-semibold ${getScoreColor(selectedAttempt.score_percentage)} px-3 py-2 rounded-lg inline-block`}>
                        {selectedAttempt.score}/{selectedAttempt.total_questions} ({selectedAttempt.score_percentage.toFixed(1)}%)
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Time Taken</dt>
                      <dd className="text-sm text-gray-900">{formatTime(selectedAttempt.time_taken)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Completed</dt>
                      <dd className="text-sm text-gray-900">{new Date(selectedAttempt.completed_at).toLocaleString()}</dd>
                    </div>
                  </dl>
                  
                  {selectedAttempt.category_scores && (
                    <div className="mt-6">
                      <h5 className="font-medium text-gray-900 mb-3">Category Breakdown</h5>
                      <div className="space-y-2">
                        {Object.entries(selectedAttempt.category_scores).map(([category, scores]) => (
                          <div key={category} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{category}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {scores.correct}/{scores.total} ({Math.round((scores.correct / scores.total) * 100)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="lg:col-span-2">
                  <h4 className="font-medium text-gray-900 mb-4">All Answers</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedAttempt.answers.map((answer, index) => {
                      const question = quizQuestions.find(q => q.id === answer.question_id)
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">Question {answer.question_id}</span>
                              {question && (
                                <p className="text-sm text-gray-700 mt-2 font-medium">
                                  {question.question}
                                </p>
                              )}
                            </div>
                            {answer.is_correct !== null && (
                              <span className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${
                                answer.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {answer.is_correct ? 'Correct' : 'Incorrect'}
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">User&apos;s Answer:</p>
                            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                              {answer.selected_answer || 'No answer provided'}
                            </p>
                          </div>
                          {question?.correct_answer && answer.is_correct === false && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Correct Answer:</p>
                              <p className="text-sm text-green-700 bg-green-50 p-3 rounded border-l-4 border-green-500">
                                {question.correct_answer}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Details Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Question {selectedQuestion.id}: {selectedQuestion.category}
              </h3>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Question Details</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-2">Question Text</h5>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {selectedQuestion.question}
                      </p>
                    </div>
                    
                    {selectedQuestion.options && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-500 mb-2">Options</h5>
                        <ul className="text-sm text-gray-900 space-y-1">
                          {Array.isArray(selectedQuestion.options) && selectedQuestion.options.map((option, index) => (
                            <li key={index} className="flex items-start">
                              <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                              <span className={option === selectedQuestion.correct_answer ? 'text-green-600 font-medium' : ''}>
                                {option}
                                {option === selectedQuestion.correct_answer && ' ✓'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-500">Type</h5>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedQuestion.type === 'multiple_choice' ? 'bg-green-100 text-green-800' :
                          selectedQuestion.type === 'short_answer' ? 'bg-yellow-100 text-yellow-800' :
                          selectedQuestion.type === 'long_answer' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedQuestion.type || 'multiple_choice'}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-500">Difficulty</h5>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          selectedQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          selectedQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedQuestion.difficulty || 'medium'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">
                    All Answers ({getQuestionAnswers(selectedQuestion.id).length})
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {getQuestionAnswers(selectedQuestion.id).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No answers yet</p>
                    ) : (
                      getQuestionAnswers(selectedQuestion.id).map((answer, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {answer.user?.name || 'Unknown User'}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({answer.user?.email})
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {answer.is_correct !== null && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  answer.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {answer.is_correct ? 'Correct' : 'Incorrect'}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(answer.attempt_score)}`}>
                                {answer.attempt_score.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {answer.selected_answer || 'No answer provided'}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Attempted: {new Date(answer.attempt_date).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
