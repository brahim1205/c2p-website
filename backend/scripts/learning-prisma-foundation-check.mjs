#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoRoot = path.resolve(backendRoot, '..');
const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');
const migrationPath = path.join(
  backendRoot,
  'prisma',
  'migrations',
  '202605291345_learning_public_foundation',
  'migration.sql',
);
const progressMigrationPath = path.join(
  backendRoot,
  'prisma',
  'migrations',
  '202605291515_learning_progress_foundation',
  'migration.sql',
);
const assessmentsMigrationPath = path.join(
  backendRoot,
  'prisma',
  'migrations',
  '202605291650_learning_assessments_foundation',
  'migration.sql',
);
const migrationPlanPath = path.join(repoRoot, 'docs', 'APPROW_MIGRATION_PLAN.md');
const persistencePath = path.join(backendRoot, 'src', 'database', 'platform-persistence.service.ts');
const projectionPath = path.join(backendRoot, 'src', 'database', 'platform-learning-projection.ts');
const snapshotSyncPath = path.join(backendRoot, 'src', 'database', 'platform-snapshot-sync.service.ts');
const snapshotLearningSyncPath = path.join(backendRoot, 'src', 'database', 'platform-snapshot-learning-sync.ts');
const consistencyCheckPath = path.join(backendRoot, 'scripts', 'learning-prisma-consistency-check.mjs');
const learningModulePath = path.join(backendRoot, 'src', 'learning', 'learning.module.ts');
const learningAccessServicePath = path.join(backendRoot, 'src', 'learning', 'learning-access.service.ts');
const learningAssessmentsReadServicePath = path.join(backendRoot, 'src', 'learning', 'learning-assessments-read.service.ts');
const learningProgressReadServicePath = path.join(backendRoot, 'src', 'learning', 'learning-progress-read.service.ts');
const learningPublicReadServicePath = path.join(backendRoot, 'src', 'learning', 'learning-public-read.service.ts');
const learningServicePath = path.join(backendRoot, 'src', 'learning', 'learning.service.ts');
const formateurLearnersServicePath = path.join(backendRoot, 'src', 'learning', 'formateur-learners.service.ts');
const packageJsonPath = path.join(backendRoot, 'package.json');

const learningModels = [
  'LearningCourse',
  'LearningCourseSection',
  'LearningCourseLesson',
  'LearningCourseReview',
  'LearningVirtualClass',
];

const learningProgressModels = [
  'LearningCourseEnrollment',
  'LearningLessonProgress',
];

const learningAssessmentModels = [
  'LearningExam',
  'LearningQuizQuestion',
  'LearningQuizChoice',
  'LearningSubmission',
  'LearningCertificate',
];

const requiredIndexes = [
  'LearningCourse_status_category_idx',
  'LearningCourseSection_courseId_status_position_idx',
  'LearningCourseLesson_courseId_status_position_idx',
  'LearningCourseReview_courseId_status_createdAt_idx',
  'LearningVirtualClass_courseId_status_idx',
];

const requiredProgressIndexes = [
  'LearningCourseEnrollment_studentId_status_idx',
  'LearningCourseEnrollment_courseId_status_idx',
  'LearningLessonProgress_studentId_courseId_idx',
  'LearningLessonProgress_lessonId_studentId_idx',
  'LearningLessonProgress_courseId_status_idx',
];

const requiredAssessmentIndexes = [
  'LearningExam_courseId_status_idx',
  'LearningExam_instructorId_status_idx',
  'LearningQuizQuestion_examId_position_idx',
  'LearningQuizChoice_questionId_position_idx',
  'LearningSubmission_examId_status_idx',
  'LearningSubmission_studentId_submittedAt_idx',
  'LearningCertificate_studentId_status_idx',
  'LearningCertificate_courseId_status_idx',
];

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier manquant: ${path.relative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function main() {
  const schemaSource = readRequiredFile(schemaPath);
  const migrationSource = readRequiredFile(migrationPath);
  const progressMigrationSource = readRequiredFile(progressMigrationPath);
  const assessmentsMigrationSource = readRequiredFile(assessmentsMigrationPath);
  const migrationPlanSource = readRequiredFile(migrationPlanPath);
  const persistenceSource = readRequiredFile(persistencePath);
  const projectionSource = readRequiredFile(projectionPath);
  const snapshotSyncSource = readRequiredFile(snapshotSyncPath);
  const snapshotLearningSyncSource = readRequiredFile(snapshotLearningSyncPath);
  const consistencyCheckSource = readRequiredFile(consistencyCheckPath);
  const learningModuleSource = readRequiredFile(learningModulePath);
  const learningAccessServiceSource = readRequiredFile(learningAccessServicePath);
  const learningAssessmentsReadServiceSource = readRequiredFile(learningAssessmentsReadServicePath);
  const learningProgressReadServiceSource = readRequiredFile(learningProgressReadServicePath);
  const learningPublicReadServiceSource = readRequiredFile(learningPublicReadServicePath);
  const learningServiceSource = readRequiredFile(learningServicePath);
  const formateurLearnersServiceSource = readRequiredFile(formateurLearnersServicePath);
  const packageJsonSource = readRequiredFile(packageJsonPath);
  const failures = [];

  for (const model of learningModels) {
    if (!new RegExp(`model\\s+${model}\\s+\\{`).test(schemaSource)) {
      failures.push(`Modele Prisma manquant: ${model}`);
    }
    if (!migrationSource.includes(`CREATE TABLE "${model}"`)) {
      failures.push(`Migration SQL manquante pour: ${model}`);
    }
  }
  for (const model of learningProgressModels) {
    if (!new RegExp(`model\\s+${model}\\s+\\{`).test(schemaSource)) {
      failures.push(`Modele Prisma manquant: ${model}`);
    }
    if (!progressMigrationSource.includes(`CREATE TABLE "${model}"`)) {
      failures.push(`Migration SQL Learning progression manquante pour: ${model}`);
    }
  }
  for (const model of learningAssessmentModels) {
    if (!new RegExp(`model\\s+${model}\\s+\\{`).test(schemaSource)) {
      failures.push(`Modele Prisma manquant: ${model}`);
    }
    if (!assessmentsMigrationSource.includes(`CREATE TABLE "${model}"`)) {
      failures.push(`Migration SQL Learning examens/certificats manquante pour: ${model}`);
    }
  }

  for (const indexName of requiredIndexes) {
    if (!migrationSource.includes(`"${indexName}"`)) {
      failures.push(`Index learning public manquant: ${indexName}`);
    }
  }
  for (const indexName of requiredProgressIndexes) {
    if (!progressMigrationSource.includes(`"${indexName}"`)) {
      failures.push(`Index learning progression manquant: ${indexName}`);
    }
  }
  for (const indexName of requiredAssessmentIndexes) {
    if (!assessmentsMigrationSource.includes(`"${indexName}"`)) {
      failures.push(`Index learning examens/certificats manquant: ${indexName}`);
    }
  }

  if (!migrationPlanSource.includes('Lot 2 - Learning')) {
    failures.push('docs/APPROW_MIGRATION_PLAN.md doit documenter le Lot 2 - Learning.');
  }
  if (!migrationPlanSource.includes('202605291345_learning_public_foundation')) {
    failures.push('Le plan AppRow doit citer la migration learning public foundation.');
  }
  if (!migrationPlanSource.includes('202605291515_learning_progress_foundation')) {
    failures.push('Le plan AppRow doit citer la migration learning progress foundation.');
  }
  if (!migrationPlanSource.includes('202605291650_learning_assessments_foundation')) {
    failures.push('Le plan AppRow doit citer la migration learning assessments foundation.');
  }
  for (const table of ['courses', 'course_sections', 'course_lessons', 'course_reviews', 'virtual_classes', 'course_enrollments', 'lesson_progress', 'exams', 'quiz_questions', 'quiz_choices', 'submissions', 'certificates']) {
    if (!persistenceSource.includes(`rowsByTable.${table}`)) {
      failures.push(`Projection double-run absente de PlatformPersistenceService: ${table}`);
    }
    if (!snapshotLearningSyncSource.includes(table)) {
      failures.push(`Helper backfill Learning public absent: ${table}`);
    }
    if (!consistencyCheckSource.includes(`'${table}'`)) {
      failures.push(`Check de coherence AppRow/Prisma absent: ${table}`);
    }
  }
  if (!projectionSource.includes('persistLearningProjection') || !projectionSource.includes('deleteLearningProjection')) {
    failures.push('La projection Learning public doit exposer persistLearningProjection et deleteLearningProjection.');
  }
  if (!snapshotSyncSource.includes('buildLearningRows(groupedRows)') || !snapshotSyncSource.includes('syncLearningSnapshot(tx, learningRows)')) {
    failures.push('PlatformSnapshotSyncService doit deleguer le backfill Learning public au helper dedie.');
  }
  if (!snapshotLearningSyncSource.includes('persistLearningProjection(tx, rowsByTable)')) {
    failures.push('Le helper snapshot Learning public doit utiliser persistLearningProjection.');
  }
  if (!learningModuleSource.includes('LearningPublicReadService')) {
    failures.push('LearningPublicReadService doit etre fourni par LearningModule.');
  }
  if (!learningModuleSource.includes('LearningProgressReadService')) {
    failures.push('LearningProgressReadService doit etre fourni par LearningModule.');
  }
  if (!learningModuleSource.includes('LearningAssessmentsReadService')) {
    failures.push('LearningAssessmentsReadService doit etre fourni par LearningModule.');
  }
  for (const method of [
    'getPublicCourses',
    'getPublicInstructorCourses',
    'getPublicCourseDetail',
    'getPublicVirtualClassDetail',
  ]) {
    if (!learningPublicReadServiceSource.includes(`async ${method}`)) {
      failures.push(`Reader Prisma Learning public incomplet: ${method}`);
    }
    if (!learningAccessServiceSource.includes(`learningPublicReadService.${method}`)) {
      failures.push(`LearningAccessService doit tenter le reader Prisma avant AppRow: ${method}`);
    }
  }
  if (!learningAccessServiceSource.includes('syncAppStoreFromDatabase(this.prisma)')) {
    failures.push('LearningAccessService doit conserver le fallback AppRow pendant la migration.');
  }
  if (!learningPublicReadServiceSource.includes("source: 'app_row'")) {
    failures.push('Le reader Prisma Learning public doit lire la projection source app_row.');
  }
  if (!learningProgressReadServiceSource.includes('learningCourseEnrollment') || !learningProgressReadServiceSource.includes('learningLessonProgress')) {
    failures.push('Le reader Prisma Learning progression doit lire inscriptions et progressions.');
  }
  if (!learningAccessServiceSource.includes('learningProgressReadService.getCourseContext')) {
    failures.push('LearningAccessService doit tenter le reader Prisma progression avant AppRow.');
  }
  for (const prismaDelegate of ['learningExam', 'learningQuizQuestion', 'learningQuizChoice', 'learningSubmission', 'learningCertificate']) {
    if (!learningAssessmentsReadServiceSource.includes(prismaDelegate)) {
      failures.push(`Le reader Prisma Learning examens/certificats doit lire ${prismaDelegate}.`);
    }
  }
  for (const runtimeSwitch of [
    'learningAssessmentsReadService.getApprenantExamsSnapshot',
    'learningAssessmentsReadService.getApprenantCertificates',
    'learningAssessmentsReadService.getQuizStructure',
    'learningAssessmentsReadService.getFormateurEvaluationsSnapshot',
    'learningAssessmentsReadService.getSubmissionById',
  ]) {
    if (!learningServiceSource.includes(runtimeSwitch)) {
      failures.push(`LearningService doit tenter le reader Prisma avant AppRow: ${runtimeSwitch}.`);
    }
  }
  if (!learningAssessmentsReadServiceSource.includes('async getCertificateById') || !learningAssessmentsReadServiceSource.includes('async assertCertificateDeleted') || !formateurLearnersServiceSource.includes('learningAssessmentsReadService.getCertificateById') || !formateurLearnersServiceSource.includes('learningAssessmentsReadService.assertCertificateDeleted')) {
    failures.push('Les mutations certificats Learning doivent relire/verifier la projection Prisma.');
  }
  if (!packageJsonSource.includes('learning:prisma-consistency:check')) {
    failures.push('package.json doit exposer learning:prisma-consistency:check.');
  }

  const report = {
    ok: failures.length === 0,
    models: learningModels,
    progressModels: learningProgressModels,
    assessmentModels: learningAssessmentModels,
    requiredIndexes: [...requiredIndexes, ...requiredProgressIndexes, ...requiredAssessmentIndexes],
    migration: path.relative(repoRoot, migrationPath),
    progressMigration: path.relative(repoRoot, progressMigrationPath),
    assessmentsMigration: path.relative(repoRoot, assessmentsMigrationPath),
    failures,
  };

  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
