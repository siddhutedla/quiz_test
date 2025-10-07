'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserInfo, QuizAttempt, QuizAnswer } from '@/lib/supabase'
import { useIsClient } from '@/hooks/useIsClient'

interface Question {
  id: number
  question: string
  options?: string[]
  correct_answer?: string
  category: string
  type: 'multiple_choice' | 'short_answer' | 'long_answer'
  max_length?: number
}

interface QuizComponentProps {
  userInfo: UserInfo
  onComplete: (attempt: QuizAttempt) => void
}

// Golden Prints Quiz Questions - 53 Total Questions (43 Multiple Choice + 8 Short Answer + 2 Long Answer)
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Which of the following best describes an \"ownership mentality\"?",
    options: [
      "Doing only what your manager tells you",
      "Taking initiative and acting in the best interest of the business",
      "Avoiding risks and waiting for clear instructions",
      "Delegating all responsibilities to others"
    ],
    correct_answer: "Taking initiative and acting in the best interest of the business",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 2,
    question: "You notice vendor payments are delayed. What is your FIRST step?",
    options: [
      "Escalate to senior leadership immediately",
      "Ignore it, since it happens often",
      "Check accounting records and communicate with vendors",
      "Wait for the vendor to complain"
    ],
    correct_answer: "Check accounting records and communicate with vendors",
    category: "Operations",
    type: "multiple_choice"
  },
  {
    id: 3,
    question: "Which is the MOST important reason for SOPs (Standard Operating Procedures)?",
    options: [
      "To reduce creativity",
      "To ensure consistency and efficiency",
      "To increase paperwork",
      "To replace training"
    ],
    correct_answer: "To ensure consistency and efficiency",
    category: "Operations",
    type: "multiple_choice"
  },
  {
    id: 4,
    question: "Which of these is a key benefit of Zoho CRM?",
    options: [
      "It automatically files taxes",
      "It manages customer relationships and sales pipelines",
      "It generates electricity",
      "It replaces accountants"
    ],
    correct_answer: "It manages customer relationships and sales pipelines",
    category: "Technology",
    type: "multiple_choice"
  },
  {
    id: 5,
    question: "A US client sends an urgent email at midnight IST. What do you do?",
    options: [
      "Reply immediately, since you must always be online",
      "Wait until your shift starts, then respond",
      "Acknowledge quickly if critical, otherwise schedule for working hours",
      "Ignore it"
    ],
    correct_answer: "Acknowledge quickly if critical, otherwise schedule for working hours",
    category: "Communication",
    type: "multiple_choice"
  },
  {
    id: 6,
    question: "Which quality is LEAST important for this role?",
    options: [
      "Strong communication skills",
      "Hunger for growth",
      "Consistent follow-through",
      "Desire to work alone with no accountability"
    ],
    correct_answer: "Desire to work alone with no accountability",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 7,
    question: "The phrase \"act like an entrepreneur\" in the job description implies:",
    options: [
      "Avoiding risks at all costs",
      "Taking ownership, solving problems, and innovating",
      "Working fewer hours for more money",
      "Doing tasks only when asked"
    ],
    correct_answer: "Taking ownership, solving problems, and innovating",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 8,
    question: "A customer leaves a 1-star review on Google. What's the BEST response?",
    options: [
      "Delete it",
      "Respond politely, acknowledge the issue, and offer resolution",
      "Argue with the customer publicly",
      "Ignore it"
    ],
    correct_answer: "Respond politely, acknowledge the issue, and offer resolution",
    category: "Customer Service",
    type: "multiple_choice"
  },
  {
    id: 9,
    question: "Which of these is a creative problem-solving example?",
    options: [
      "Copying a competitor's approach exactly",
      "Stopping operations until someone else solves it",
      "Designing a new workflow to reduce errors",
      "Avoiding new solutions"
    ],
    correct_answer: "Designing a new workflow to reduce errors",
    category: "Problem Solving",
    type: "multiple_choice"
  },
  {
    id: 10,
    question: "If a sales rep misses their target, you should:",
    options: [
      "Fire them immediately",
      "Provide feedback, training, and set clear expectations",
      "Ignore it",
      "Reduce their salary"
    ],
    correct_answer: "Provide feedback, training, and set clear expectations",
    category: "Management",
    type: "multiple_choice"
  },
  {
    id: 11,
    question: "\"Hungry and aggressive for growth\" suggests:",
    options: [
      "Always being dissatisfied",
      "Taking initiative and pushing for improvement",
      "Being rude to clients",
      "Cutting corners"
    ],
    correct_answer: "Taking initiative and pushing for improvement",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 12,
    question: "Which report is MOST important for compliance?",
    options: [
      "Fashion trends",
      "Financial statements and tax filings",
      "Daily memes",
      "Random customer emails"
    ],
    correct_answer: "Financial statements and tax filings",
    category: "Compliance",
    type: "multiple_choice"
  },
  {
    id: 13,
    question: "Which of these would NOT be part of digital marketing?",
    options: [
      "Google Ads",
      "SEO optimization",
      "Instagram campaigns",
      "Preparing financial statements"
    ],
    correct_answer: "Preparing financial statements",
    category: "Marketing",
    type: "multiple_choice"
  },
  {
    id: 14,
    question: "Which is an example of agency at work?",
    options: [
      "Waiting for a manager to assign tasks",
      "Identifying a broken process and fixing it proactively",
      "Avoiding accountability for mistakes",
      "Following instructions blindly"
    ],
    correct_answer: "Identifying a broken process and fixing it proactively",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 15,
    question: "In sales strategy, \"lead conversion rate\" means:",
    options: [
      "Percentage of website visitors",
      "Percentage of leads turned into paying customers",
      "Total number of cold calls",
      "Marketing spend per campaign"
    ],
    correct_answer: "Percentage of leads turned into paying customers",
    category: "Sales",
    type: "multiple_choice"
  },
  {
    id: 16,
    question: "Which is an example of poor written English?",
    options: [
      "\"Dear Sir, I will complete this by tomorrow.\"",
      "\"Hey boss, u no worry, I finish lol.\"",
      "\"I will ensure this is done on priority.\"",
      "\"Attached is the requested file for your review.\""
    ],
    correct_answer: "\"Hey boss, u no worry, I finish lol.\"",
    category: "Communication",
    type: "multiple_choice"
  },
  {
    id: 17,
    question: "A US customer uses slang you don't understand. What do you do?",
    options: [
      "Pretend you understand",
      "Politely ask for clarification",
      "Ignore it",
      "End the conversation"
    ],
    correct_answer: "Politely ask for clarification",
    category: "Communication",
    type: "multiple_choice"
  },
  {
    id: 18,
    question: "Which is the most measurable KPI for marketing?",
    options: [
      "Creativity of campaign",
      "Click-through rate",
      "Employee mood",
      "Logo color"
    ],
    correct_answer: "Click-through rate",
    category: "Marketing",
    type: "multiple_choice"
  },
  {
    id: 19,
    question: "You are asked to cut costs by 10%. What's your BEST approach?",
    options: [
      "Reduce critical staff immediately",
      "Analyze expenses, prioritize cuts with least impact on growth",
      "Cancel all marketing",
      "Stop paying vendors"
    ],
    correct_answer: "Analyze expenses, prioritize cuts with least impact on growth",
    category: "Financial Management",
    type: "multiple_choice"
  },
  {
    id: 20,
    question: "Which leadership style works best for scaling teams?",
    options: [
      "Micromanagement",
      "Autocratic control",
      "Coaching and empowerment",
      "Avoiding involvement"
    ],
    correct_answer: "Coaching and empowerment",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 21,
    question: "What is the opposite of accountability?",
    options: [
      "Ownership",
      "Transparency",
      "Blame-shifting",
      "Responsibility"
    ],
    correct_answer: "Blame-shifting",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 22,
    question: "IQ-style: If all entrepreneurs are leaders, and some leaders are employees, then:",
    options: [
      "All entrepreneurs are employees",
      "Some entrepreneurs may be employees",
      "No entrepreneur is an employee",
      "Entrepreneurs cannot be leaders"
    ],
    correct_answer: "Some entrepreneurs may be employees",
    category: "Logic",
    type: "multiple_choice"
  },

  {
    id: 23,
    question: "If 5 workers complete a project in 10 days, how many days will 10 workers take (assuming equal productivity)?",
    options: [
      "5 days",
      "10 days",
      "20 days",
      "2 days"
    ],
    correct_answer: "5 days",
    category: "Math",
    type: "multiple_choice"
  },
  {
    id: 24,
    question: "Which tax is typically required in India for businesses?",
    options: [
      "GST",
      "Property tax only",
      "Road tax only",
      "Import duty only"
    ],
    correct_answer: "GST",
    category: "Business",
    type: "multiple_choice"
  },
  {
    id: 25,
    question: "Which option is the BEST example of proactive communication?",
    options: [
      "Waiting until asked for updates",
      "Sending regular progress reports before being asked",
      "Avoiding tough conversations",
      "Replying late"
    ],
    correct_answer: "Sending regular progress reports before being asked",
    category: "Communication",
    type: "multiple_choice"
  },
  {
    id: 26,
    question: "Which US holiday often affects business operations in November?",
    options: [
      "Diwali",
      "Thanksgiving",
      "Holi",
      "Ramadan"
    ],
    correct_answer: "Thanksgiving",
    category: "Business",
    type: "multiple_choice"
  },
  {
    id: 27,
    question: "Which of these is a CRM tool?",
    options: [
      "Photoshop",
      "Zoho",
      "AutoCAD",
      "Canva"
    ],
    correct_answer: "Zoho",
    category: "Technology",
    type: "multiple_choice"
  },
  {
    id: 28,
    question: "What is the plural of \"criterion\"?",
    options: [
      "Criterions",
      "Criteria",
      "Criterias",
      "Criterion"
    ],
    correct_answer: "Criteria",
    category: "English",
    type: "multiple_choice"
  },
  {
    id: 29,
    question: "Which of these is MOST important for customer loyalty?",
    options: [
      "Fast responses and consistent service",
      "Expensive marketing",
      "Frequent discounts only",
      "Aggressive sales tactics"
    ],
    correct_answer: "Fast responses and consistent service",
    category: "Customer Service",
    type: "multiple_choice"
  },
  {
    id: 30,
    question: "If sales revenue is ₹10,00,000 and costs are ₹7,50,000, what is profit?",
    options: [
      "₹2,50,000",
      "₹7,50,000",
      "₹10,00,000",
      "₹17,50,000"
    ],
    correct_answer: "₹2,50,000",
    category: "Math",
    type: "multiple_choice"
  },
  {
    id: 31,
    question: "Which is a strong interview question to test ownership?",
    options: [
      "\"How many siblings do you have?\"",
      "\"Describe a time when you fixed a problem without being asked.\"",
      "\"What is your favorite movie?\"",
      "\"What is 2 + 2?\""
    ],
    correct_answer: "\"Describe a time when you fixed a problem without being asked.\"",
    category: "HR",
    type: "multiple_choice"
  },
  {
    id: 32,
    question: "Which is the most effective sales follow-up?",
    options: [
      "One generic email sent once",
      "A personalized sequence of emails and calls",
      "No follow-up",
      "Waiting for client to reply"
    ],
    correct_answer: "A personalized sequence of emails and calls",
    category: "Sales",
    type: "multiple_choice"
  },

  {
    id: 33,
    question: "What's the BEST way to scale sales quickly?",
    options: [
      "Hire more salespeople without training",
      "Build repeatable processes and train effectively",
      "Cut marketing budget",
      "Sell to anyone without targeting"
    ],
    correct_answer: "Build repeatable processes and train effectively",
    category: "Sales",
    type: "multiple_choice"
  },
  {
    id: 34,
    question: "Which of the following is NOT a key characteristic of an ownership mentality?",
    options: [
      "Taking responsibility for outcomes",
      "Blaming others for failures",
      "Proactively solving problems",
      "Thinking long-term"
    ],
    correct_answer: "Blaming others for failures",
    category: "Leadership",
    type: "multiple_choice"
  },
  {
    id: 35,
    question: "When managing vendor relationships, which approach is most effective?",
    options: [
      "Always negotiating for the lowest price",
      "Building long-term partnerships with reliable vendors",
      "Switching vendors frequently to keep them competitive",
      "Avoiding communication unless there's a problem"
    ],
    correct_answer: "Building long-term partnerships with reliable vendors",
    category: "Vendor Management",
    type: "multiple_choice"
  },
  {
    id: 36,
    question: "What is the primary purpose of a sales pipeline?",
    options: [
      "To track marketing expenses",
      "To manage and track potential customers through the sales process",
      "To store customer contact information",
      "To generate invoices"
    ],
    correct_answer: "To manage and track potential customers through the sales process",
    category: "Sales",
    type: "multiple_choice"
  },
  {
    id: 37,
    question: "Which of these is the best approach to handling customer complaints?",
    options: [
      "Ignoring them until they go away",
      "Listening actively, acknowledging the issue, and providing solutions",
      "Defending the company's position immediately",
      "Transferring them to someone else"
    ],
    correct_answer: "Listening actively, acknowledging the issue, and providing solutions",
    category: "Customer Service",
    type: "multiple_choice"
  },
  {
    id: 38,
    question: "What is the most effective way to measure team performance?",
    options: [
      "Only tracking individual metrics",
      "Using a combination of quantitative and qualitative measures",
      "Relying solely on customer feedback",
      "Comparing to industry averages only"
    ],
    correct_answer: "Using a combination of quantitative and qualitative measures",
    category: "Performance Management",
    type: "multiple_choice"
  },
  {
    id: 39,
    question: "Which approach is best for handling conflicting priorities?",
    options: [
      "Always choosing the most urgent task",
      "Evaluating impact and aligning with business goals",
      "Doing whatever the boss asks for first",
      "Avoiding difficult decisions"
    ],
    correct_answer: "Evaluating impact and aligning with business goals",
    category: "Decision Making",
    type: "multiple_choice"
  },
  {
    id: 40,
    question: "Which of these best demonstrates strategic thinking?",
    options: [
      "Focusing only on immediate tasks",
      "Considering long-term implications and planning accordingly",
      "Following established procedures without question",
      "Avoiding any risks or changes"
    ],
    correct_answer: "Considering long-term implications and planning accordingly",
    category: "Strategic Thinking",
    type: "multiple_choice"
  },
  // Short Answer Questions (8 questions)
  {
    id: 41,
    question: "Describe a time you took initiative without being told. What was the outcome?",
    category: "Leadership",
    type: "short_answer",
    max_length: 200
  },
  {
    id: 42,
    question: "How would you explain \"ownership mentality\" to a new team member?",
    category: "Leadership",
    type: "short_answer",
    max_length: 200
  },
  {
    id: 43,
    question: "Write a professional 2-sentence reply to a client who is upset about late delivery.",
    category: "Communication",
    type: "short_answer",
    max_length: 200
  },
  {
    id: 44,
    question: "Suggest one improvement you would make to a sales funnel for faster conversions.",
    category: "Sales",
    type: "short_answer",
    max_length: 200
  },
  {
    id: 45,
    question: "How do you balance speed vs. quality in business operations?",
    category: "Operations",
    type: "short_answer",
    max_length: 200
  },
  {
    id: 46,
    question: "What daily habits help you stay accountable?",
    category: "Leadership",
    type: "short_answer",
    max_length: 200
  },
  {
    id: 47 ,
    question: "If given ₹1,00,000 budget for digital marketing, how would you allocate it?",
    category: "Marketing",
    type: "short_answer",
    max_length: 200
  },
  {
    id: 48,
    question: "In one paragraph, describe how you would manage a remote team effectively.",
    category: "Management",
    type: "short_answer",
    max_length: 300
  },
  // Long Answer Questions (2 questions)
  {
    id: 49,
    question: "Imagine sales have dropped 25% in 3 months. Walk me through your step-by-step plan to identify the root cause and turn the business around.",
    category: "Strategic Thinking",
    type: "long_answer",
    max_length: 1000
  },
  {
    id: 50,
    question: "You're tasked with building an operations team from scratch in India to support a US-based business. Describe in detail how you would recruit, train, and scale this team while ensuring alignment with US time zones and client expectations.",
    category: "Operations",
    type: "long_answer",
    max_length: 1000
  }
]

const QUIZ_DURATION = 18 * 60 // 18 minutes in seconds

export default function QuizComponent({ userInfo, onComplete }: QuizComponentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: string}>({})
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION)
  const [quizStarted, setQuizStarted] = useState(false)
  const isClient = useIsClient()

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimeColor = (timeLeft: number) => {
    if (timeLeft <= 60) return 'text-red-600'
    if (timeLeft <= 300) return 'text-yellow-600'
    return 'text-green-600'
  }

  const handleSubmitQuiz = useCallback(() => {
    const quizAnswers: QuizAnswer[] = SAMPLE_QUESTIONS.map(q => {
      const isMultipleChoice = q.type === 'multiple_choice'
      return {
        question_id: q.id,
        selected_answer: answers[q.id] || '',
        is_correct: isMultipleChoice ? (answers[q.id] === q.correct_answer) : null // null for text answers
      }
    })

    // Only score multiple choice questions
    const multipleChoiceQuestions = SAMPLE_QUESTIONS.filter(q => q.type === 'multiple_choice')
    const score = quizAnswers.filter(a => a.is_correct === true).length
    const timeTaken = QUIZ_DURATION - timeLeft
    const scorePercentage = Math.round((score / multipleChoiceQuestions.length) * 100)

    // Calculate category scores (hidden from users) - only for multiple choice
    const categoryScores: {[category: string]: {correct: number, total: number}} = {}
    multipleChoiceQuestions.forEach(q => {
      const answer = quizAnswers.find(a => a.question_id === q.id)
      if (!categoryScores[q.category]) {
        categoryScores[q.category] = { correct: 0, total: 0 }
      }
      categoryScores[q.category].total++
      if (answer?.is_correct) {
        categoryScores[q.category].correct++
      }
    })

    const attempt: QuizAttempt = {
      user_id: userInfo.id || 'temp-user-id',
      score,
      total_questions: multipleChoiceQuestions.length, // Only count multiple choice for scoring
      time_taken: timeTaken,
      answers: quizAnswers,
      score_percentage: scorePercentage,
      category_scores: categoryScores
    }

    onComplete(attempt)
  }, [answers, timeLeft, userInfo, onComplete])

  useEffect(() => {
    if (!quizStarted) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [quizStarted, handleSubmitQuiz])

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [SAMPLE_QUESTIONS[currentQuestionIndex].id]: answer
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < SAMPLE_QUESTIONS.length - 1) {
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

  if (!quizStarted) {
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
            You&apos;re about to begin a 50-question quiz with a 15-minute time limit.
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-amber-800 mb-4">Quiz Rules:</h3>
            <ul className="text-left text-amber-700 space-y-2">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                43 multiple choice questions
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                8 short answer questions (1-2 sentences)
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                2 long answer questions (detailed responses)
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                15 minute time limit
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                You can navigate between questions
              </li>
            </ul>
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

  const currentQuestion = SAMPLE_QUESTIONS[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / SAMPLE_QUESTIONS.length) * 100

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Question {currentQuestionIndex + 1} of {SAMPLE_QUESTIONS.length}
          </h2>
          <p className="text-gray-600">{currentQuestion.category}</p>
        </div>
        <div className={`text-2xl font-bold ${getTimeColor(timeLeft)}`}>
          {isClient ? formatTime(timeLeft) : '15:00'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
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
        
        {currentQuestion.type === 'multiple_choice' ? (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  answers[currentQuestion.id] === option
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={() => handleAnswerSelect(option)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                  answers[currentQuestion.id] === option
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-gray-300'
                }`}>
                  {answers[currentQuestion.id] === option && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerSelect(e.target.value)}
                placeholder={currentQuestion.type === 'short_answer' ? 'Enter your answer here (1-2 sentences)...' : 'Enter your detailed answer here...'}
                className={`w-full p-4 border-2 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors text-gray-900 placeholder-gray-500 bg-white ${
                  currentQuestion.type === 'long_answer' ? 'h-40' : 'h-24'
                }`}
                maxLength={currentQuestion.max_length}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {(answers[currentQuestion.id] || '').length}/{currentQuestion.max_length}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {currentQuestion.type === 'short_answer' ? 
                'Keep your answer concise (1-2 sentences).' : 
                'Provide a detailed, comprehensive answer.'
              }
            </div>
          </div>
        )}
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
          {currentQuestionIndex === SAMPLE_QUESTIONS.length - 1 ? (
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
          {SAMPLE_QUESTIONS.map((question, index) => {
            const questionType = question.type
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
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`p-2 text-sm rounded-lg border transition-colors relative ${buttonClass}`}
                title={`Question ${index + 1}: ${questionType === 'multiple_choice' ? 'Multiple Choice' : questionType === 'short_answer' ? 'Short Answer' : 'Long Answer'}`}
              >
                {index + 1}
                {questionType !== 'multiple_choice' && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
              <span>Multiple Choice</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
              <span>Text Answer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
