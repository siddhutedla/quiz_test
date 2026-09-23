'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabaseDb, UserInfo, QuizQuestionRow, QuizAttemptWithUser } from '@/lib/supabase'
import {
  Grade, TimingBand, SECTION_ORDER, sectionLabel, formatSeconds,
  TIMING_LABELS, ACCURACY_WEIGHT, TIMING_WEIGHT, GRADE_THRESHOLDS,
} from '@/lib/grading'

type Attempt = QuizAttemptWithUser
type AttemptSortKey = 'name' | 'grade' | 'accuracy' | 'timing' | 'time' | 'completed'
type QuestionSortKey = 'id' | 'section' | 'pct_correct' | 'avg_time' | 'answered'
type SortDir = 'asc' | 'desc'

const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'F']

const gradeClass = (grade?: string | null) => ({
  A: 'bg-green-100 text-green-800 border-green-200',
  B: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  D: 'bg-orange-100 text-orange-800 border-orange-200',
  F: 'bg-red-100 text-red-800 border-red-200',
}[grade ?? ''] ?? 'bg-gray-100 text-gray-700 border-gray-200')

const scoreClass = (pct: number) => {
  if (pct >= 80) return 'text-green-700'
  if (pct >= 60) return 'text-yellow-700'
  return 'text-red-700'
}

const timingClass = (band: TimingBand) => ({
  ideal: 'bg-green-100 text-green-800',
  on_time: 'bg-yellow-100 text-yellow-800',
  over: 'bg-red-100 text-red-800',
  unanswered: 'bg-gray-100 text-gray-600',
}[band])

const num = (v: number | string | null | undefined) => Number(v ?? 0)

// Older rows (pre-grading-system) won't have a grade; derive one from accuracy so sorting still works
const attemptWeighted = (a: Attempt) => a.weighted_score != null ? num(a.weighted_score) : num(a.score_percentage)
const attemptGrade = (a: Attempt): Grade =>
  a.grade ?? GRADE_THRESHOLDS.find(t => attemptWeighted(a) >= t.min)!.grade

function SortHeader<K extends string>({
  label, sortKey, current, dir, onSort, className = '',
}: { label: string; sortKey: K; current: K; dir: SortDir; onSort: (k: K) => void; className?: string }) {
  const active = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 ${active ? 'text-amber-700' : 'text-gray-500'} ${className}`}
    >
      {label} <span className="inline-block w-3">{active ? (dir === 'asc' ? '↑' : '↓') : ''}</span>
    </th>
  )
}

function Bar({ pct, color = 'bg-amber-500' }: { pct: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [users, setUsers] = useState<UserInfo[]>([])
  const [quizAttempts, setQuizAttempts] = useState<Attempt[]>([])
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'attempts' | 'questions'>('attempts')
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<QuizQuestionRow | null>(null)
  const [starredAttempts, setStarredAttempts] = useState<Set<string>>(new Set())
  const [sendingEmail, setSendingEmail] = useState<Set<string>>(new Set())
  const [emailSentAttempts, setEmailSentAttempts] = useState<Set<string>>(new Set())
  const [emailStatus, setEmailStatus] = useState<{ [key: string]: 'error' }>({})

  // Submissions table controls
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<'all' | Grade>('all')
  const [starredOnly, setStarredOnly] = useState(false)
  const [attemptSort, setAttemptSort] = useState<AttemptSortKey>('completed')
  const [attemptDir, setAttemptDir] = useState<SortDir>('desc')

  // Questions table controls
  const [questionSearch, setQuestionSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState<'all' | string>('all')
  const [questionSort, setQuestionSort] = useState<QuestionSortKey>('id')
  const [questionDir, setQuestionDir] = useState<SortDir>('asc')

  // Attempt-modal controls
  const [showOnlyWrong, setShowOnlyWrong] = useState(false)

  const handleSendEmail = async (attempt: Attempt, user: UserInfo | null | undefined) => {
    if (!user) return

    setSendingEmail(prev => new Set(prev).add(attempt.id))
    setEmailStatus(prev => {
      const newStatus = { ...prev }
      delete newStatus[attempt.id]
      return newStatus
    })

    try {
      const response = await fetch('https://n8n-test-3ndm.onrender.com/webhook/7a0c202f-c430-4d28-a4c1-9b43d300cf39', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          linkedinUrl: user.linkedin_url,
          scorePercentage: num(attempt.score_percentage),
          weightedScore: attemptWeighted(attempt),
          grade: attemptGrade(attempt),
        })
      })

      if (response.ok) {
        setEmailSentAttempts(prev => {
          const newSet = new Set(prev)
          newSet.add(attempt.id)
          localStorage.setItem('emailSentAttempts', JSON.stringify(Array.from(newSet)))
          return newSet
        })
      } else {
        setEmailStatus(prev => ({ ...prev, [attempt.id]: 'error' }))
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setEmailStatus(prev => ({ ...prev, [attempt.id]: 'error' }))
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
      const saved = localStorage.getItem('starredAttempts')
      if (saved) setStarredAttempts(new Set(JSON.parse(saved)))
      const savedEmails = localStorage.getItem('emailSentAttempts')
      if (savedEmails) setEmailSentAttempts(new Set(JSON.parse(savedEmails)))
    }
  }, [isAuthenticated])

  const toggleStar = (attemptId: string) => {
    setStarredAttempts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(attemptId)) newSet.delete(attemptId)
      else newSet.add(attemptId)
      localStorage.setItem('starredAttempts', JSON.stringify(Array.from(newSet)))
      return newSet
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
      setLoadError(null)

      const [usersResponse, attemptsResponse, questionsResponse] = await Promise.all([
        supabaseDb.getAllUsers(),
        supabaseDb.getAllQuizAttempts(),
        supabaseDb.getAllQuizQuestions(),
      ])
      const firstError = usersResponse.error || attemptsResponse.error || questionsResponse.error
      if (firstError) setLoadError(firstError.message)

      setUsers(usersResponse.data)
      setQuizAttempts(attemptsResponse.data)
      setQuizQuestions(questionsResponse.data)
    } catch (error) {
      console.error('Error loading admin data:', error)
      setLoadError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const userFor = (attempt: Attempt) => attempt.user ?? users.find(u => u.id === attempt.user_id) ?? null
  const questionById = useMemo(() => new Map(quizQuestions.map(q => [q.id, q])), [quizQuestions])

  // ---- Submissions: filter + sort ----
  const onAttemptSort = (key: AttemptSortKey) => {
    if (key === attemptSort) setAttemptDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setAttemptSort(key)
      setAttemptDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const visibleAttempts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = quizAttempts.filter(a => {
      const u = userFor(a)
      if (starredOnly && !starredAttempts.has(a.id)) return false
      if (gradeFilter !== 'all' && attemptGrade(a) !== gradeFilter) return false
      if (q && !(u?.name?.toLowerCase().includes(q) || u?.email?.toLowerCase().includes(q))) return false
      return true
    })
    const dir = attemptDir === 'asc' ? 1 : -1
    const gradeRank = (g: Grade) => GRADES.indexOf(g)
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (attemptSort) {
        case 'name': cmp = (userFor(a)?.name ?? '').localeCompare(userFor(b)?.name ?? ''); break
        case 'grade':
          cmp = gradeRank(attemptGrade(b)) - gradeRank(attemptGrade(a)) // A ranks highest
          if (cmp === 0) cmp = attemptWeighted(a) - attemptWeighted(b)
          break
        case 'accuracy': cmp = num(a.score_percentage) - num(b.score_percentage); break
        case 'timing': cmp = num(a.timing_score) - num(b.timing_score); break
        case 'time': cmp = a.time_taken - b.time_taken; break
        case 'completed': cmp = new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime(); break
      }
      return cmp * dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizAttempts, users, search, gradeFilter, starredOnly, starredAttempts, attemptSort, attemptDir])

  const stats = useMemo(() => {
    const n = quizAttempts.length
    const avg = (f: (a: Attempt) => number) => (n ? quizAttempts.reduce((s, a) => s + f(a), 0) / n : 0)
    const dist = Object.fromEntries(GRADES.map(g => [g, 0])) as Record<Grade, number>
    quizAttempts.forEach(a => { dist[attemptGrade(a)]++ })
    return {
      n,
      avgWeighted: avg(attemptWeighted),
      avgAccuracy: avg(a => num(a.score_percentage)),
      avgTiming: avg(a => num(a.timing_score)),
      dist,
    }
  }, [quizAttempts])

  // ---- Questions: per-question aggregate stats ----
  const questionStats = useMemo(() => {
    const map = new Map<number, { answered: number; correct: number; totalTime: number; over: number }>()
    quizAttempts.forEach(a => {
      (a.answers ?? []).forEach(ans => {
        const s = map.get(ans.question_id) ?? { answered: 0, correct: 0, totalTime: 0, over: 0 }
        if (ans.selected_answer) {
          s.answered++
          if (ans.is_correct) s.correct++
          s.totalTime += ans.time_spent_sec ?? 0
          if (ans.timing === 'over') s.over++
        }
        map.set(ans.question_id, s)
      })
    })
    return map
  }, [quizAttempts])

  const qStat = (id: number) => {
    const s = questionStats.get(id) ?? { answered: 0, correct: 0, totalTime: 0, over: 0 }
    return {
      ...s,
      pct: s.answered ? (s.correct / s.answered) * 100 : null,
      avgTime: s.answered ? s.totalTime / s.answered : null,
    }
  }

  const onQuestionSort = (key: QuestionSortKey) => {
    if (key === questionSort) setQuestionDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setQuestionSort(key)
      setQuestionDir(key === 'id' || key === 'section' ? 'asc' : 'desc')
    }
  }

  const visibleQuestions = useMemo(() => {
    const q = questionSearch.trim().toLowerCase()
    const filtered = quizQuestions.filter(qu => {
      if (sectionFilter !== 'all' && qu.section !== sectionFilter) return false
      if (q && !qu.question.toLowerCase().includes(q) && !String(qu.id).includes(q)) return false
      return true
    })
    const dir = questionDir === 'asc' ? 1 : -1
    const nil = (v: number | null) => (v === null ? -Infinity : v)
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (questionSort) {
        case 'id': cmp = a.id - b.id; break
        case 'section': cmp = SECTION_ORDER.indexOf(a.section as never) - SECTION_ORDER.indexOf(b.section as never) || a.id - b.id; break
        case 'pct_correct': cmp = nil(qStat(a.id).pct) - nil(qStat(b.id).pct); break
        case 'avg_time': cmp = nil(qStat(a.id).avgTime) - nil(qStat(b.id).avgTime); break
        case 'answered': cmp = qStat(a.id).answered - qStat(b.id).answered; break
      }
      return cmp * dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizQuestions, questionSearch, sectionFilter, questionSort, questionDir, questionStats])

  const sections = useMemo(() => {
    const present = Array.from(new Set(quizQuestions.map(q => q.section)))
    return [...SECTION_ORDER.filter(s => present.includes(s)), ...present.filter(s => !SECTION_ORDER.includes(s as never))]
  }, [quizQuestions])

  const getQuestionAnswers = (questionId: number) =>
    quizAttempts.flatMap(attempt =>
      (attempt.answers ?? [])
        .filter(answer => answer.question_id === questionId)
        .map(answer => ({
          ...answer,
          user: userFor(attempt),
          attempt_date: attempt.completed_at,
          attempt_grade: attemptGrade(attempt),
          attempt_score: attemptWeighted(attempt),
        }))
    )

  const exportCsv = () => {
    const header = ['Name', 'Email', 'LinkedIn', 'Grade', 'Weighted Score', 'Accuracy %', 'Correct', 'Total', 'Timing %', 'Time Taken (s)', 'Tab Switches', 'Completed',
      ...sections.map(s => `${sectionLabel(s)} %`)]
    const rows = visibleAttempts.map(a => {
      const u = userFor(a)
      return [
        u?.name ?? '', u?.email ?? '', u?.linkedin_url ?? '', attemptGrade(a), attemptWeighted(a).toFixed(1),
        num(a.score_percentage).toFixed(1), a.score, a.total_questions, num(a.timing_score).toFixed(1), a.time_taken,
        a.tab_switches ?? 0,
        new Date(a.completed_at).toISOString(),
        ...sections.map(s => a.section_scores?.[s]?.pct ?? ''),
      ]
    })
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `quiz-submissions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ---------------- Render ----------------

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

  const inputClass = 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-4 justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Manager Assessment</h1>
              <p className="text-gray-600 mt-1">Submissions, grades, and question performance</p>
            </div>
            <div className="flex space-x-3">
              <button onClick={loadData} className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors">
                Refresh Data
              </button>
              <button onClick={() => setIsAuthenticated(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
            Could not load some data: {loadError}
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Submissions', value: String(stats.n) },
            { label: 'Avg weighted score', value: `${stats.avgWeighted.toFixed(1)}%` },
            { label: 'Avg accuracy', value: `${stats.avgAccuracy.toFixed(1)}%` },
            { label: 'Avg timing', value: `${stats.avgTiming.toFixed(1)}%` },
          ].map(t => (
            <div key={t.label} className="bg-white rounded-lg shadow px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-gray-500">{t.label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{t.value}</div>
            </div>
          ))}
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-gray-500">Grade distribution</div>
            <div className="flex gap-1.5 mt-2">
              {GRADES.map(g => (
                <button
                  key={g}
                  onClick={() => { setActiveTab('attempts'); setGradeFilter(gradeFilter === g ? 'all' : g) }}
                  className={`flex-1 rounded border text-center py-1 text-xs font-semibold ${gradeClass(g)} ${gradeFilter === g ? 'ring-2 ring-amber-500' : ''}`}
                  title={`Filter by grade ${g}`}
                >
                  {g}<div className="text-sm">{stats.dist[g]}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'attempts', name: 'Submissions', count: quizAttempts.length },
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
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or email…"
                className={`${inputClass} w-64`}
              />
              <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value as 'all' | Grade)} className={inputClass}>
                <option value="all">All grades</option>
                {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={starredOnly} onChange={e => setStarredOnly(e.target.checked)} className="accent-amber-500" />
                Starred only
              </label>
              <span className="text-sm text-gray-500 ml-auto">
                Showing {visibleAttempts.length} of {quizAttempts.length}
              </span>
              <button onClick={exportCsv} className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <SortHeader label="Candidate" sortKey="name" current={attemptSort} dir={attemptDir} onSort={onAttemptSort} />
                    <SortHeader label="Grade" sortKey="grade" current={attemptSort} dir={attemptDir} onSort={onAttemptSort} />
                    <SortHeader label="Accuracy" sortKey="accuracy" current={attemptSort} dir={attemptDir} onSort={onAttemptSort} />
                    <SortHeader label="Timing" sortKey="timing" current={attemptSort} dir={attemptDir} onSort={onAttemptSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sections</th>
                    <SortHeader label="Time" sortKey="time" current={attemptSort} dir={attemptDir} onSort={onAttemptSort} />
                    <SortHeader label="Completed" sortKey="completed" current={attemptSort} dir={attemptDir} onSort={onAttemptSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleAttempts.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-500">No submissions match these filters.</td></tr>
                  )}
                  {visibleAttempts.map((attempt) => {
                    const user = userFor(attempt)
                    const isStarred = starredAttempts.has(attempt.id)
                    const grade = attemptGrade(attempt)
                    return (
                      <tr key={attempt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={() => toggleStar(attempt.id)} className="text-xl hover:scale-110 transition-transform" title="Star">
                            {isStarred ? '⭐' : '☆'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{user?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{user?.email || 'No email'}</div>
                          {user?.linkedin_url && (
                            <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">
                              LinkedIn ↗
                            </a>
                          )}
                          {(attempt.tab_switches ?? 0) > 0 && (
                            <div className="text-xs text-red-600 mt-1" title="Times the candidate left the quiz tab">
                              {attempt.tab_switches} tab switch{attempt.tab_switches === 1 ? '' : 'es'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-lg font-bold ${gradeClass(grade)}`}>{grade}</span>
                            <span className="text-sm font-semibold text-gray-900">{attemptWeighted(attempt).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`text-sm font-medium ${scoreClass(num(attempt.score_percentage))}`}>
                            {num(attempt.score_percentage).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">{attempt.score}/{attempt.total_questions}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {attempt.timing_score != null ? (
                            <>
                              <div className={`text-sm font-medium ${scoreClass(num(attempt.timing_score))}`}>{num(attempt.timing_score).toFixed(0)}%</div>
                              {attempt.timing_summary && (
                                <div className="text-xs text-gray-500">{attempt.timing_summary.over_max} over max</div>
                              )}
                            </>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {sections.map(s => {
                              const sc = attempt.section_scores?.[s]
                              const pct = sc ? sc.pct : null
                              return (
                                <div key={s} title={`${sectionLabel(s)}: ${sc ? `${sc.correct}/${sc.total} (${sc.pct}%)` : 'n/a'}`}
                                  className="w-7 h-7 rounded text-[10px] font-semibold flex items-center justify-center"
                                  style={{ background: pct === null ? '#f3f4f6' : pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fef9c3' : '#fee2e2', color: pct === null ? '#9ca3af' : pct >= 80 ? '#166534' : pct >= 60 ? '#854d0e' : '#991b1b' }}>
                                  {pct === null ? '–' : Math.round(pct)}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatSeconds(attempt.time_taken)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(attempt.completed_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => { setSelectedAttempt(attempt); setShowOnlyWrong(false) }}
                              className="text-amber-600 hover:text-amber-900 text-left text-xs"
                            >
                              View Answers
                            </button>
                            <button
                              onClick={() => handleSendEmail(attempt, user)}
                              disabled={sendingEmail.has(attempt.id) || emailSentAttempts.has(attempt.id)}
                              className={`text-left text-xs ${
                                emailSentAttempts.has(attempt.id)
                                  ? 'text-green-600'
                                  : emailStatus[attempt.id] === 'error'
                                  ? 'text-red-600 hover:text-red-900'
                                  : 'text-blue-600 hover:text-blue-900'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {sendingEmail.has(attempt.id)
                                ? '⏳ Sending...'
                                : emailSentAttempts.has(attempt.id)
                                ? '✓ Sent'
                                : emailStatus[attempt.id] === 'error'
                                ? '✗ Failed — retry'
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
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
              <input
                type="search"
                value={questionSearch}
                onChange={e => setQuestionSearch(e.target.value)}
                placeholder="Search question text or #…"
                className={`${inputClass} w-64`}
              />
              <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className={inputClass}>
                <option value="all">All sections</option>
                {sections.map(s => <option key={s} value={s}>{sectionLabel(s)}</option>)}
              </select>
              <span className="text-sm text-gray-500 ml-auto">Showing {visibleQuestions.length} of {quizQuestions.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortHeader label="#" sortKey="id" current={questionSort} dir={questionDir} onSort={onQuestionSort} />
                    <SortHeader label="Section" sortKey="section" current={questionSort} dir={questionDir} onSort={onQuestionSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    <SortHeader label="Answered" sortKey="answered" current={questionSort} dir={questionDir} onSort={onQuestionSort} />
                    <SortHeader label="% Correct" sortKey="pct_correct" current={questionSort} dir={questionDir} onSort={onQuestionSort} />
                    <SortHeader label="Avg time" sortKey="avg_time" current={questionSort} dir={questionDir} onSort={onQuestionSort} />
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        <p className="text-lg font-medium">No questions found in database</p>
                        <p className="mt-1 text-sm">Run <code className="bg-gray-100 px-1 rounded">bun run db:setup</code> to seed the quiz_questions table.</p>
                      </td>
                    </tr>
                  ) : (
                    visibleQuestions.map((question) => {
                      const st = qStat(question.id)
                      return (
                        <tr key={question.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedQuestion(question)}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{question.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {sectionLabel(question.section)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 max-w-md truncate" title={question.question}>{question.question}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="font-bold text-green-700">{question.correct_answer}</span>
                            <span className="text-gray-500 text-xs ml-1 inline-block max-w-[10rem] truncate align-bottom" title={question.options?.[question.correct_answer]}>
                              {question.options?.[question.correct_answer]}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{question.ideal_time_sec}s / {question.max_time_sec}s</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{st.answered}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {st.pct === null ? <span className="text-xs text-gray-400">—</span> : (
                              <div className="w-28">
                                <div className={`text-sm font-medium ${scoreClass(st.pct)}`}>{st.pct.toFixed(0)}%</div>
                                <Bar pct={st.pct} color={st.pct >= 80 ? 'bg-green-500' : st.pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'} />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {st.avgTime === null ? <span className="text-xs text-gray-400">—</span> : (
                              <span className={st.avgTime <= question.ideal_time_sec ? 'text-green-700' : st.avgTime <= question.max_time_sec ? 'text-yellow-700' : 'text-red-700'}>
                                {st.avgTime.toFixed(0)}s
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-amber-600">Details →</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Attempt Details Modal */}
      {selectedAttempt && (() => {
        const user = userFor(selectedAttempt)
        const grade = attemptGrade(selectedAttempt)
        const answers = selectedAttempt.answers ?? []
        const ts = selectedAttempt.timing_summary
        const sectionsInAttempt = sections.length ? sections : Object.keys(selectedAttempt.section_scores ?? {})
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedAttempt(null)}>
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user?.name ?? 'Unknown'}</h3>
                  <p className="text-sm text-gray-500">{user?.email} · {new Date(selectedAttempt.completed_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedAttempt(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                    {/* Grade summary */}
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center justify-center w-16 h-16 rounded-xl border text-3xl font-bold ${gradeClass(grade)}`}>{grade}</span>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{attemptWeighted(selectedAttempt).toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">weighted score ({Math.round(ACCURACY_WEIGHT * 100)}% accuracy + {Math.round(TIMING_WEIGHT * 100)}% timing)</div>
                      </div>
                    </div>
                    <dl className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <dt className="text-xs text-gray-500">Accuracy</dt>
                        <dd className={`text-lg font-semibold ${scoreClass(num(selectedAttempt.score_percentage))}`}>{num(selectedAttempt.score_percentage).toFixed(0)}%</dd>
                        <dd className="text-xs text-gray-500">{selectedAttempt.score}/{selectedAttempt.total_questions}</dd>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <dt className="text-xs text-gray-500">Timing</dt>
                        <dd className={`text-lg font-semibold ${scoreClass(num(selectedAttempt.timing_score))}`}>{selectedAttempt.timing_score != null ? `${num(selectedAttempt.timing_score).toFixed(0)}%` : '—'}</dd>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <dt className="text-xs text-gray-500">Time taken</dt>
                        <dd className="text-lg font-semibold text-gray-900">{formatSeconds(selectedAttempt.time_taken)}</dd>
                      </div>
                    </dl>

                    <div className={`rounded-lg p-3 border ${
                      (selectedAttempt.tab_switches ?? 0) > 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-transparent'
                    }`}>
                      <div className="text-xs text-gray-500">Tab switches</div>
                      <div className={`text-lg font-semibold ${
                        (selectedAttempt.tab_switches ?? 0) > 0 ? 'text-red-700' : 'text-gray-900'
                      }`}>
                        {selectedAttempt.tab_switches ?? 0}
                      </div>
                      {(selectedAttempt.tab_switches ?? 0) > 0 && (
                        <div className="text-xs text-red-600 mt-1">Candidate left this tab during the quiz</div>
                      )}
                    </div>

                    {ts && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Pace</h5>
                        <div className="flex flex-wrap gap-2">
                          {(['ideal', 'on_time', 'over', 'unanswered'] as TimingBand[]).map(b => {
                            const count = { ideal: ts.within_ideal, on_time: ts.on_time, over: ts.over_max, unanswered: ts.unanswered }[b]
                            return (
                              <span key={b} className={`text-xs px-2 py-1 rounded-full ${timingClass(b)}`}>
                                {TIMING_LABELS[b]}: {count}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {selectedAttempt.section_scores && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Section Breakdown</h5>
                        <div className="space-y-3">
                          {sectionsInAttempt.map(section => {
                            const sc = selectedAttempt.section_scores?.[section]
                            if (!sc) return null
                            return (
                              <div key={section}>
                                <div className="flex justify-between items-center text-sm mb-1">
                                  <span className="text-gray-700">{sectionLabel(section)}</span>
                                  <span className={`font-medium ${scoreClass(sc.pct)}`}>{sc.correct}/{sc.total} · {Math.round(sc.pct)}%</span>
                                </div>
                                <Bar pct={sc.pct} color={sc.pct >= 80 ? 'bg-green-500' : sc.pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'} />
                                {sc.avg_time_sec != null && (
                                  <div className="text-xs text-gray-500 mt-1">avg {sc.avg_time_sec}s/question{sc.over_max ? ` · ${sc.over_max} over max` : ''}</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Answers ({answers.length})</h4>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={showOnlyWrong} onChange={e => setShowOnlyWrong(e.target.checked)} className="accent-amber-500" />
                        Only incorrect / unanswered
                      </label>
                    </div>
                    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
                      {sectionsInAttempt.map(section => {
                        const rows = answers
                          .filter(a => (questionById.get(a.question_id)?.section ?? 'unknown') === section)
                          .filter(a => !showOnlyWrong || !a.is_correct)
                        if (rows.length === 0) return null
                        return (
                          <div key={section}>
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 sticky top-0 bg-white py-1">{sectionLabel(section)}</h5>
                            <div className="space-y-3">
                              {rows.map(answer => {
                                const question = questionById.get(answer.question_id)
                                const band = answer.timing ?? (answer.selected_answer ? undefined : 'unanswered')
                                return (
                                  <div key={answer.question_id} className={`border rounded-lg p-4 ${answer.is_correct ? 'border-gray-200' : 'border-red-200 bg-red-50/30'}`}>
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                      <p className="text-sm text-gray-900 font-medium">
                                        <span className="text-gray-500 mr-1">Q{answer.question_id}.</span>
                                        {question?.question ?? '(question not found)'}
                                      </p>
                                      <div className="flex gap-1.5 flex-shrink-0">
                                        {band && <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${timingClass(band)}`}>{answer.time_spent_sec ?? 0}s</span>}
                                        <span className={`text-xs px-2 py-1 rounded-full ${answer.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {answer.is_correct ? 'Correct' : answer.selected_answer ? 'Incorrect' : 'Unanswered'}
                                        </span>
                                      </div>
                                    </div>
                                    {question?.options && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                                        {Object.entries(question.options).map(([key, text]) => {
                                          const isCorrect = key === question.correct_answer
                                          const isSelected = key === answer.selected_answer
                                          return (
                                            <div key={key} className={`px-2.5 py-1.5 rounded border flex gap-2 ${
                                              isCorrect ? 'border-green-400 bg-green-50 text-green-900'
                                              : isSelected ? 'border-red-400 bg-red-50 text-red-900'
                                              : 'border-gray-100 text-gray-600'
                                            }`}>
                                              <span className="font-bold">{key}</span>
                                              <span className="flex-1">{text}</span>
                                              {isSelected && <span className="text-xs self-center">{isCorrect ? '✓ chosen' : '✗ chosen'}</span>}
                                              {isCorrect && !isSelected && <span className="text-xs self-center">✓</span>}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                    {question && (
                                      <div className="text-xs text-gray-400 mt-2">budget {question.ideal_time_sec}s ideal / {question.max_time_sec}s max</div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {showOnlyWrong && answers.every(a => a.is_correct) && (
                        <p className="text-sm text-gray-500 text-center py-6">Every answer was correct.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Question Details Modal */}
      {selectedQuestion && (() => {
        const qAnswers = getQuestionAnswers(selectedQuestion.id)
        const st = qStat(selectedQuestion.id)
        const choiceCounts = Object.fromEntries(Object.keys(selectedQuestion.options ?? {}).map(k => [k, 0])) as Record<string, number>
        qAnswers.forEach(a => { if (a.selected_answer in choiceCounts) choiceCounts[a.selected_answer]++ })
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedQuestion(null)}>
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question {selectedQuestion.id} · {sectionLabel(selectedQuestion.section)}
                </h3>
                <button onClick={() => setSelectedQuestion(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-2">Question</h5>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedQuestion.question}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-2">Options · how candidates answered</h5>
                      <ul className="space-y-1.5">
                        {Object.entries(selectedQuestion.options ?? {}).map(([key, text]) => {
                          const isCorrect = key === selectedQuestion.correct_answer
                          const pct = st.answered ? (choiceCounts[key] / st.answered) * 100 : 0
                          return (
                            <li key={key} className={`px-3 py-2 rounded border text-sm ${isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                              <div className="flex gap-2 items-start">
                                <span className="font-bold">{key}</span>
                                <span className={`flex-1 ${isCorrect ? 'text-green-800 font-medium' : 'text-gray-800'}`}>{text}{isCorrect && ' ✓'}</span>
                                <span className="text-xs text-gray-500 whitespace-nowrap">{choiceCounts[key]} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="mt-1.5"><Bar pct={pct} color={isCorrect ? 'bg-green-500' : 'bg-gray-400'} /></div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">% correct</div>
                        <div className={`text-lg font-semibold ${st.pct === null ? 'text-gray-400' : scoreClass(st.pct)}`}>{st.pct === null ? '—' : `${st.pct.toFixed(0)}%`}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Avg time</div>
                        <div className="text-lg font-semibold text-gray-900">{st.avgTime === null ? '—' : `${st.avgTime.toFixed(0)}s`}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Budget</div>
                        <div className="text-lg font-semibold text-gray-900">{selectedQuestion.ideal_time_sec}s <span className="text-sm text-gray-500">/ {selectedQuestion.max_time_sec}s</span></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Candidate answers ({qAnswers.length})</h4>
                    <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                      {qAnswers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No answers yet</p>
                      ) : (
                        qAnswers.map((answer, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-sm font-bold flex-shrink-0 ${gradeClass(answer.attempt_grade)}`}>
                              {answer.attempt_grade}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{answer.user?.name || 'Unknown User'}</div>
                              <div className="text-xs text-gray-500 truncate">{answer.user?.email} · {new Date(answer.attempt_date).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {answer.timing && <span className={`text-xs px-2 py-1 rounded-full ${timingClass(answer.timing)}`}>{answer.time_spent_sec ?? 0}s</span>}
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${answer.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {answer.selected_answer || '—'} {answer.is_correct ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
