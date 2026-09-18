// Grading system for the Order Manager assessment.
//
// Each attempt is scored on two axes:
//   Accuracy  — % of questions answered correctly.
//   Timing    — how well the candidate stayed within each question's time budget:
//                 within ideal        -> 100 pts
//                 ideal < t <= max    -> 70 pts
//                 over max            -> 30 pts
//                 unanswered          -> 0 pts
// Final weighted score = 80% accuracy + 20% timing, mapped to a letter grade.

import type { SectionKey } from '@/data/questions'

export const SECTION_LABELS: Record<SectionKey, string> = {
  instruction_following: 'Instruction Following',
  operations_judgment: 'Operations Judgment',
  factory_communication: 'Factory Communication',
  customer_communication: 'Customer Communication',
  english: 'English',
}

export const SECTION_ORDER: SectionKey[] = [
  'instruction_following',
  'operations_judgment',
  'factory_communication',
  'customer_communication',
  'english',
]

export const sectionLabel = (key: string) =>
  SECTION_LABELS[key as SectionKey] ?? key

export type TimingBand = 'ideal' | 'on_time' | 'over' | 'unanswered'

export const TIMING_POINTS: Record<TimingBand, number> = {
  ideal: 100,
  on_time: 70,
  over: 30,
  unanswered: 0,
}

export const TIMING_LABELS: Record<TimingBand, string> = {
  ideal: 'Within ideal',
  on_time: 'On time',
  over: 'Over max',
  unanswered: 'Unanswered',
}

export const ACCURACY_WEIGHT = 0.8
export const TIMING_WEIGHT = 0.2

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export const GRADE_THRESHOLDS: { grade: Grade; min: number }[] = [
  { grade: 'A', min: 90 },
  { grade: 'B', min: 80 },
  { grade: 'C', min: 70 },
  { grade: 'D', min: 60 },
  { grade: 'F', min: 0 },
]

export function gradeLetter(weightedScore: number): Grade {
  return GRADE_THRESHOLDS.find(t => weightedScore >= t.min)!.grade
}

export function timingBand(
  timeSpentSec: number,
  idealSec: number,
  maxSec: number,
  answered: boolean
): TimingBand {
  if (!answered) return 'unanswered'
  if (timeSpentSec <= idealSec) return 'ideal'
  if (timeSpentSec <= maxSec) return 'on_time'
  return 'over'
}

// Minimal question shape needed for grading (matches the quiz_questions table)
export interface GradableQuestion {
  id: number
  section: string
  correct_answer: string
  ideal_time_sec: number
  max_time_sec: number
}

export interface RawAnswer {
  question_id: number
  selected_answer: string // 'A' | 'B' | 'C' | 'D' | ''
  time_spent_sec: number
}

export interface GradedAnswer extends RawAnswer {
  is_correct: boolean
  timing: TimingBand
}

export interface SectionScore {
  correct: number
  total: number
  pct: number
  avg_time_sec: number
  within_ideal: number
  on_time: number
  over_max: number
  unanswered: number
}

export interface TimingSummary {
  within_ideal: number
  on_time: number
  over_max: number
  unanswered: number
}

export interface GradedAttempt {
  score: number
  total_questions: number
  accuracy_pct: number
  timing_pct: number
  weighted_score: number
  grade: Grade
  section_scores: Record<string, SectionScore>
  timing_summary: TimingSummary
  answers: GradedAnswer[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function gradeAttempt(
  questions: GradableQuestion[],
  rawAnswers: RawAnswer[]
): GradedAttempt {
  const byId = new Map(rawAnswers.map(a => [a.question_id, a]))

  const answers: GradedAnswer[] = questions.map(q => {
    const raw = byId.get(q.id) ?? { question_id: q.id, selected_answer: '', time_spent_sec: 0 }
    const answered = raw.selected_answer !== ''
    return {
      ...raw,
      is_correct: answered && raw.selected_answer === q.correct_answer,
      timing: timingBand(raw.time_spent_sec, q.ideal_time_sec, q.max_time_sec, answered),
    }
  })

  const total = questions.length
  const score = answers.filter(a => a.is_correct).length
  const accuracy_pct = total ? (score / total) * 100 : 0
  const timing_pct = total
    ? answers.reduce((sum, a) => sum + TIMING_POINTS[a.timing], 0) / total
    : 0
  const weighted_score = ACCURACY_WEIGHT * accuracy_pct + TIMING_WEIGHT * timing_pct

  const timing_summary: TimingSummary = { within_ideal: 0, on_time: 0, over_max: 0, unanswered: 0 }
  const section_scores: Record<string, SectionScore> = {}
  const sectionTime: Record<string, number> = {}

  questions.forEach((q, i) => {
    const a = answers[i]
    const s = (section_scores[q.section] ??= {
      correct: 0, total: 0, pct: 0, avg_time_sec: 0,
      within_ideal: 0, on_time: 0, over_max: 0, unanswered: 0,
    })
    s.total++
    if (a.is_correct) s.correct++
    sectionTime[q.section] = (sectionTime[q.section] ?? 0) + a.time_spent_sec

    const bandKey = ({ ideal: 'within_ideal', on_time: 'on_time', over: 'over_max', unanswered: 'unanswered' } as const)[a.timing]
    s[bandKey]++
    timing_summary[bandKey]++
  })

  for (const [section, s] of Object.entries(section_scores)) {
    s.pct = round1((s.correct / s.total) * 100)
    s.avg_time_sec = round1(sectionTime[section] / s.total)
  }

  return {
    score,
    total_questions: total,
    accuracy_pct: round1(accuracy_pct),
    timing_pct: round1(timing_pct),
    weighted_score: round1(weighted_score),
    grade: gradeLetter(weighted_score),
    section_scores,
    timing_summary,
    answers,
  }
}

export const formatSeconds = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
