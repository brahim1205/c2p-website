import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const projections = [
  { appRowTable: 'courses', model: 'learningCourse' },
  { appRowTable: 'course_sections', model: 'learningCourseSection' },
  { appRowTable: 'course_lessons', model: 'learningCourseLesson' },
  { appRowTable: 'course_reviews', model: 'learningCourseReview' },
  { appRowTable: 'virtual_classes', model: 'learningVirtualClass' },
  { appRowTable: 'course_enrollments', model: 'learningCourseEnrollment' },
  { appRowTable: 'lesson_progress', model: 'learningLessonProgress' },
  { appRowTable: 'exams', model: 'learningExam' },
  { appRowTable: 'quiz_questions', model: 'learningQuizQuestion' },
  { appRowTable: 'quiz_choices', model: 'learningQuizChoice' },
  { appRowTable: 'submissions', model: 'learningSubmission' },
  { appRowTable: 'certificates', model: 'learningCertificate' },
];

async function main() {
  const rows = [];
  const failures = [];

  for (const projection of projections) {
    const appRows = await prisma.appRow.count({ where: { table: projection.appRowTable } });
    const prismaRows = await prisma[projection.model].count({ where: { source: 'app_row' } });
    rows.push({ table: projection.appRowTable, appRows, prismaRows });

    if (appRows !== prismaRows) {
      failures.push(`${projection.appRowTable}: AppRow=${appRows}, Prisma=${prismaRows}`);
    }
  }

  console.log(JSON.stringify({
    status: failures.length === 0 ? 'ok' : 'failed',
    rows,
  }, null, 2));

  if (failures.length > 0) {
    throw new Error(`Learning public AppRow/Prisma mismatch: ${failures.join('; ')}`);
  }
}

main()
  .catch((error) => {
    if (error && typeof error === 'object' && error.code === 'P2021') {
      console.error('Schema Prisma Learning public absent. Execute `npx prisma db push --skip-generate` ou les migrations avant ce check.');
      process.exitCode = 1;
      return;
    }
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
