'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UserInfo, QuizAttempt, QuizQuestionRow, supabaseDb } from '@/lib/supabase'
import { useIsClient } from '@/hooks/useIsClient'
import { useQuizProctoring } from '@/hooks/useQuizProctoring'
import { QUESTIONS } from '@/data/questions'
import { gradeAttempt, sectionLabel, formatSeconds } from '@/lib/grading'

interface QuizComponentProps {
  userInfo: UserInfo
  onComplete: (attempt: QuizAttempt) => void
}

// Fallback if the database is unreachable — same bank the DB is seeded from
const FALLBACK_QUESTIONS: QuizQuestionRow[] = QUESTIONS.map(q => ({
  id: q.id,
  section: q.section,
  question: q.question,
  options: q.options,
  correct_answer: q.answer,
  ideal_time_sec: q.time_sec.ideal,
  max_time_sec: q.time_sec.max,
}))

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

export default function QuizComponent({ userInfo, onComplete }: QuizComponentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [id: number]: string }>({})
  const [timeSpent, setTimeSpent] = useState<{ [id: number]: number }>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizDuration, setQuizDuration] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const submittedRef = useRef(false)
  const isClient = useIsClient()
  const { tabSwitches, tabSwitchesRef, showLeaveWarning, dismissWarning } =
    useQuizProctoring(quizStarted)

  // Fetch questions from database on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await supabaseDb.getAllQuizQuestions()
        const loaded = response.data && response.data.length > 0 ? response.data : FALLBACK_QUESTIONS
        setQuestions(loaded)
        // Overall limit is the sum of every question's max time
        const total = loaded.reduce((sum, q) => sum + q.max_time_sec, 0)
        setQuizDuration(total)
        setTimeLeft(total)
      } catch (error) {
        console.error('Error fetching questions:', error)
        setQuestions(FALLBACK_QUESTIONS)
        const total = FALLBACK_QUESTIONS.reduce((sum, q) => sum + q.max_time_sec, 0)
        setQuizDuration(total)
        setTimeLeft(total)
      } finally {
        setLoadingQuestions(false)
      }
    }

    fetchQuestions()
  }, [])

  const getTimeColor = (seconds: number) => {
    if (seconds <= 60) return 'text-red-600'
    if (seconds <= 300) return 'text-yellow-600'
    return 'text-green-600'
  }

  const handleSubmitQuiz = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true

    const graded = gradeAttempt(
      questions,
      questions.map(q => ({
        question_id: q.id,
        selected_answer: answers[q.id] || '',
        time_spent_sec: timeSpent[q.id] || 0,
      }))
    )

    const attempt: QuizAttempt = {
      user_id: userInfo.id || 'temp-user-id',
      score: graded.score,
      total_questions: graded.total_questions,
      time_taken: quizDuration - timeLeft,
      answers: graded.answers,
      score_percentage: graded.accuracy_pct,
      timing_score: graded.timing_pct,
      weighted_score: graded.weighted_score,
      grade: graded.grade,
      section_scores: graded.section_scores,
      timing_summary: graded.timing_summary,
      tab_switches: tabSwitchesRef.current,
    }

    onComplete(attempt)
  }, [answers, timeSpent, timeLeft, quizDuration, userInfo, onComplete, questions, tabSwitchesRef])

  // One ticker: counts the overall clock down and the current question's time up
  useEffect(() => {
    if (!quizStarted) return

    const timer = setInterval(() => {
      const currentId = questions[currentQuestionIndex]?.id
      if (currentId !== undefined) {
        setTimeSpent(prev => ({ ...prev, [currentId]: (prev[currentId] || 0) + 1 }))
      }
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [quizStarted, currentQuestionIndex, questions, handleSubmitQuiz])

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const startQuiz = () => {
    setQuizStarted(true)
  }

  // Prevent hydration mismatch by not rendering until client is ready
  if (!isClient) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Show loading state while fetching questions
  if (loadingQuestions) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 mx-auto max-w-md"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 mx-auto max-w-xs"></div>
          <div className="h-4 bg-gray-200 rounded mb-8 mx-auto max-w-sm"></div>
          <div className="h-12 bg-gray-200 rounded mx-auto max-w-xs"></div>
        </div>
        <p className="text-gray-600 mt-4">Loading quiz questions...</p>
      </div>
    )
  }

  // Show error if no questions loaded
  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Quiz</h2>
        <p className="text-gray-600">Unable to load quiz questions. Please try again later.</p>
      </div>
    )
  }

  if (!quizStarted) {
    const sections = Array.from(new Set(questions.map(q => q.section)))
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start?
          </h2>
          <p className="text-gray-600 text-lg">
            Hello <span className="font-semibold text-amber-600">{userInfo.name}</span>!
            You&apos;re about to begin a {questions.length}-question assessment with a {formatSeconds(quizDuration)} time limit.
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-amber-800 mb-4">Quiz Rules:</h3>
          <ul className="text-amber-700 space-y-2">
            {[
              `${questions.length} multiple-choice questions across ${sections.length} sections`,
              `${formatSeconds(quizDuration)} total time limit`,
              'Speed counts toward your score — work steadily and don’t linger',
              'You can navigate between questions before submitting',
              'Stay on this tab — leaving or switching tabs is recorded',
              'Copying, pasting, and right-click are disabled during the quiz',
            ].map(rule => (
              <li key={rule} className="flex items-start">
                <svg className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {rule}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {sections.map(s => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-800">
                {sectionLabel(s)} · {questions.filter(q => q.section === s).length}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={startQuiz}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold py-4 px-8 rounded-lg hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
        >
          Start Quiz
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto select-none">
      {showLeaveWarning && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Tab switch detected</p>
            <p className="text-sm text-red-700 mt-1">
              Leaving this page is recorded. You have switched away {tabSwitches} time{tabSwitches === 1 ? '' : 's'}.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissWarning}
            className="text-sm font-medium text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Question {currentQuestionIndex + 1} of {questions.length}
          </h2>
          <p className="text-gray-600">{sectionLabel(currentQuestion.section)}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getTimeColor(timeLeft)}`}>
            {formatSeconds(timeLeft)}
          </div>
          <div className="text-xs text-gray-500">time remaining</div>
          {tabSwitches > 0 && (
            <div className="text-xs text-red-600 mt-1">
              {tabSwitches} tab switch{tabSwitches === 1 ? '' : 'es'}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{answeredCount} of {questions.length} answered</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-amber-500 to-yellow-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {OPTION_KEYS.filter(k => currentQuestion.options[k] !== undefined).map(key => {
            const selected = answers[currentQuestion.id] === key
            return (
              <label
                key={key}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selected ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={key}
                  checked={selected}
                  onChange={() => handleAnswerSelect(key)}
                  className="sr-only"
                />
                <div className={`w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  selected ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 text-gray-600'
                }`}>
                  {key}
                </div>
                <span className="text-gray-900">{currentQuestion.options[key]}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <div className="flex space-x-4">
          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-8 rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold py-3 px-6 rounded-lg hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Next Question
            </button>
          )}
        </div>
      </div>

      {/* Question Navigation */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Jump to Question:</h4>
        <div className="grid grid-cols-10 gap-2">
          {questions.map((question, index) => {
            const hasAnswer = answers[question.id]
            const isCurrent = index === currentQuestionIndex

            let buttonClass = ''
            if (isCurrent) {
              buttonClass = 'bg-amber-500 text-white border-amber-500'
            } else if (hasAnswer) {
              buttonClass = 'bg-green-100 text-green-800 border-green-300'
            } else {
              buttonClass = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }

            return (
              <button
                key={question.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`p-2 text-sm rounded-lg border transition-colors ${buttonClass}`}
                title={`Question ${index + 1}: ${sectionLabel(question.section)}`}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
