import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const assets = await prisma.appRow.findMany({ where: { table: 'lesson_assets', data: { path: ['asset_type'], equals: 'video' } } });
  const lessons = await prisma.appRow.findMany({ where: { table: 'course_lessons' } });
  
  for (const asset of assets) {
    console.log('Video Asset ID:', asset.id, 'Lesson ID:', asset.data.lesson_id, 'Course ID:', asset.data.course_id);
    const lesson = lessons.find(l => String(l.id) === String(asset.data.lesson_id) || String(l.data.id) === String(asset.data.lesson_id));
    if (lesson) {
      console.log('  -> Found Lesson:', lesson.data.title, 'Type:', lesson.data.type);
    } else {
      console.log('  -> Lesson NOT FOUND in appRow course_lessons!');
    }
  }
  process.exit(0);
}
run();
