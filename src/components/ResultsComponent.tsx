'use client'

import { useState, useEffect } from 'react'
import { UserInfo, QuizAttempt, supabaseDb } from '@/lib/supabase'
import { useIsClient } from '@/hooks/useIsClient'

interface ResultsComponentProps {
  userInfo: UserInfo
  quizAttempt: QuizAttempt
  onRestart: () => void
}

export default function ResultsComponent({ userInfo, quizAttempt, onRestart }: ResultsComponentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isClient = useIsClient()


  useEffect(() => {
    const submitResults = async () => {
      if (submitSuccess || isSubmitting) return

      setIsSubmitting(true)
      setSubmitError(null)

      // Submit in background without blocking UI
      supabaseDb.createQuizAttempt({
        user_id: userInfo.id || 'temp-user-id',
        score: quizAttempt.score,
        total_questions: quizAttempt.total_questions,
        time_taken: quizAttempt.time_taken,
        answers: quizAttempt.answers,
        score_percentage: quizAttempt.score_percentage,
        category_scores: quizAttempt.category_scores
      }).then(({ error }) => {
        if (error) {
          console.error('Error creating quiz attempt:', error)
          setSubmitError('Failed to save quiz results: ' + error.message)
        } else {
          console.log('Quiz attempt saved successfully!')
          setSubmitSuccess(true)
        }
        setIsSubmitting(false)
      }).catch((error) => {
        console.error('Error submitting results:', error)
        setSubmitError(error instanceof Error ? error.message : 'Failed to submit results')
        setIsSubmitting(false)
      })

      // Show success immediately for better UX
      setTimeout(() => {
        if (!submitError) {
          setSubmitSuccess(true)
        }
      }, 1000)
    }

    submitResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty - we only want this to run once when component mounts

  // Prevent hydration mismatch by not rendering until client is ready
  if (!isClient) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="h-32 bg-gray-200 rounded mb-8"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Thank You!
        </h2>
        <p className="text-gray-600 text-xl mb-2">
          <span className="font-semibold text-amber-600">{userInfo.name}</span>
        </p>
        <p className="text-gray-600 text-lg">
          Your quiz has been successfully submitted.
        </p>
      </div>

      {/* Thank You Message */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-8 mb-8 border border-amber-200">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-amber-800 mb-4">
            We&apos;ll Be In Touch Soon!
          </h3>
          <p className="text-amber-700 text-lg leading-relaxed mb-6">
            Thank you for taking the time to complete our quiz. Our team will review your responses 
            and reach out to you shortly with next steps.
          </p>
          <div className="flex items-center justify-center space-x-4 text-amber-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold">We&apos;ll contact you at {userInfo.email}</span>
          </div>
        </div>
      </div>

      {/* Golden Prints Information */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">About Golden Prints</h3>
        <p className="text-gray-700 leading-relaxed">
          Golden Prints is dedicated to helping individuals and organizations achieve their goals 
          through innovative solutions and personalized approaches. We appreciate your interest 
          in joining our community.
        </p>
      </div>

      {/* Submit Status */}
      <div className="mb-8">
        {isSubmitting && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-yellow-800">Submitting your results...</span>
            </div>
          </div>
        )}

        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800">Results successfully saved!</span>
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">Error: {submitError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {submitSuccess && (
          <a
            href="https://goldenprints.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold py-4 px-8 rounded-lg hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg text-center"
          >
            Visit Golden Prints
          </a>
        )}
        
        <button
          onClick={onRestart}
          className="bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold py-4 px-8 rounded-lg hover:from-gray-700 hover:to-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg"
        >
          Take Quiz Again
        </button>
      </div>
    </div>
  )
}
