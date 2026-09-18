// Seeds the quiz_questions table from src/data/questions.ts.
// Tables + RLS policies come from db/schema.sql; `bun run db:setup` applies
// that first and then runs this. Idempotent — questions are upserted by id.

import { PrismaClient } from '@prisma/client'
import { QUESTIONS } from '../src/data/questions'

const prisma = new PrismaClient()

async function main() {
  console.log(`Seeding ${QUESTIONS.length} questions…`)
  for (const q of QUESTIONS) {
    const data = {
      section: q.section,
      question: q.question,
      options: q.options,
      correctAnswer: q.answer,
      idealTimeSec: q.time_sec.ideal,
      maxTimeSec: q.time_sec.max,
    }
    await prisma.quizQuestion.upsert({
      where: { id: q.id },
      create: { id: q.id, ...data },
      update: data,
    })
  }

  // Remove any questions no longer in the bank
  const removed = await prisma.quizQuestion.deleteMany({
    where: { id: { notIn: QUESTIONS.map(q => q.id) } },
  })
  if (removed.count) console.log(`Removed ${removed.count} stale question(s)`)

  const count = await prisma.quizQuestion.count()
  const bySection = await prisma.quizQuestion.groupBy({ by: ['section'], _count: true })
  console.log(`Done. ${count} questions in database:`)
  bySection.forEach(s => console.log(`  ${s.section}: ${s._count}`))
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
