// Seeds the quiz_questions table from src/data/questions.ts and sets up
// row-level security so the browser (anon key) can read questions and write
// users / attempts. Run after `prisma db push`:
//
//   bun run db:setup
//
// Idempotent — safe to re-run; questions are upserted by id.

import { PrismaClient } from '@prisma/client'
import { QUESTIONS } from '../src/data/questions'

const prisma = new PrismaClient()

const RLS_SQL = [
  `ALTER TABLE users ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY`,

  `DROP POLICY IF EXISTS "anon read questions" ON quiz_questions`,
  `CREATE POLICY "anon read questions" ON quiz_questions FOR SELECT TO anon, authenticated USING (true)`,

  `DROP POLICY IF EXISTS "anon read users" ON users`,
  `CREATE POLICY "anon read users" ON users FOR SELECT TO anon, authenticated USING (true)`,
  `DROP POLICY IF EXISTS "anon insert users" ON users`,
  `CREATE POLICY "anon insert users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true)`,

  `DROP POLICY IF EXISTS "anon read attempts" ON quiz_attempts`,
  `CREATE POLICY "anon read attempts" ON quiz_attempts FOR SELECT TO anon, authenticated USING (true)`,
  `DROP POLICY IF EXISTS "anon insert attempts" ON quiz_attempts`,
  `CREATE POLICY "anon insert attempts" ON quiz_attempts FOR INSERT TO anon, authenticated WITH CHECK (true)`,
]

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

  console.log('Applying row-level security policies…')
  for (const sql of RLS_SQL) {
    await prisma.$executeRawUnsafe(sql)
  }

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
