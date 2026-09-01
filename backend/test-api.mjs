import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { LearningAccessService } from './src/learning/learning-access.service.js';
import { AuthUser } from './src/auth/auth.store.js';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(LearningAccessService);
  
  const user = { id: 'test', role: 'apprenant', firstName: 'test', lastName: 'test' };
  
  try {
    const courseId = '201'; // Assuming 201 is the course ID from earlier DB check
    const result = await service.getApprenantCourseDetail(courseId, user);
    console.dir(result.modules, { depth: null });
  } catch (e) {
    console.error(e.message);
  }
  
  await app.close();
  process.exit(0);
}
run();
