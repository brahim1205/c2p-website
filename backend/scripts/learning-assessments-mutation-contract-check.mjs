#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoRoot = path.resolve(backendRoot, '..');

const files = {
  packageJson: path.join(backendRoot, 'package.json'),
  ci: path.join(repoRoot, '.github', 'workflows', 'ci.yml'),
  learningService: path.join(backendRoot, 'src', 'learning', 'learning.service.ts'),
  formateurLearnersService: path.join(backendRoot, 'src', 'learning', 'formateur-learners.service.ts'),
  assessmentsCommandService: path.join(backendRoot, 'src', 'learning', 'learning-assessments-command.service.ts'),
  assessmentsReadService: path.join(backendRoot, 'src', 'learning', 'learning-assessments-read.service.ts'),
  migrationPlan: path.join(repoRoot, 'docs', 'APPROW_MIGRATION_PLAN.md'),
};

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier manquant: ${path.relative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function methodBody(source, methodName) {
  const match = new RegExp(`async\\s+${methodName}\\([^)]*\\)\\s+\\{([\\s\\S]*?)\\n  \\}`, 'm').exec(source);
  return match?.[1] ?? '';
}

function main() {
  const packageJsonSource = readRequiredFile(files.packageJson);
  const ciSource = readRequiredFile(files.ci);
  const learningServiceSource = readRequiredFile(files.learningService);
  const formateurLearnersSource = readRequiredFile(files.formateurLearnersService);
  const commandServiceSource = readRequiredFile(files.assessmentsCommandService);
  const readServiceSource = readRequiredFile(files.assessmentsReadService);
  const migrationPlanSource = readRequiredFile(files.migrationPlan);
  const failures = [];

  const requiredReadMethods = [
    'getSubmissionById',
    'getCertificateById',
    'getExamById',
    'getQuestionById',
    'getChoiceById',
    'getQuestionsByIds',
    'getChoicesByIds',
  ];
  const requiredDeleteAssertions = [
    'assertCertificateDeleted',
    'assertExamDeleted',
    'assertQuestionDeleted',
    'assertChoiceDeleted',
  ];

  for (const method of [...requiredReadMethods, ...requiredDeleteAssertions]) {
    if (!readServiceSource.includes(`async ${method}`)) {
      failures.push(`LearningAssessmentsReadService doit exposer ${method}.`);
    }
  }

  const learningMutationContracts = [
    ['submitApprenantExam', 'getSubmissionById'],
    ['gradeFormateurSubmission', 'getSubmissionById'],
    ['createFormateurExam', 'getExamById'],
    ['deleteFormateurExam', 'assertExamDeleted'],
    ['createFormateurQuizQuestion', 'getQuestionById'],
    ['updateFormateurQuizQuestion', 'getQuestionById'],
    ['deleteFormateurQuizQuestion', 'assertQuestionDeleted'],
    ['reorderFormateurQuizQuestion', 'getQuestionsByIds'],
    ['createFormateurQuizChoice', 'getChoiceById'],
    ['updateFormateurQuizChoice', 'getChoiceById'],
    ['deleteFormateurQuizChoice', 'assertChoiceDeleted'],
    ['reorderFormateurQuizChoice', 'getChoicesByIds'],
  ];

  for (const [mutationMethod, readbackMethod] of learningMutationContracts) {
    const body = methodBody(commandServiceSource, mutationMethod) || methodBody(learningServiceSource, mutationMethod);
    if (!body) {
      failures.push(`LearningService ou LearningAssessmentsCommandService doit exposer ${mutationMethod}.`);
    } else if (!body.includes(`learningAssessmentsReadService.${readbackMethod}`)) {
      failures.push(`${mutationMethod} doit utiliser ${readbackMethod} apres persistence/delete.`);
    }
  }

  for (const [mutationMethod, readbackMethod] of [
    ['issueCertificate', 'getCertificateById'],
    ['deleteCertificate', 'assertCertificateDeleted'],
  ]) {
    const body = methodBody(formateurLearnersSource, mutationMethod);
    if (!body) {
      failures.push(`FormateurLearnersService doit exposer ${mutationMethod}.`);
    } else if (!body.includes(`learningAssessmentsReadService.${readbackMethod}`)) {
      failures.push(`${mutationMethod} doit utiliser ${readbackMethod} apres persistence/delete.`);
    }
  }

  if (!packageJsonSource.includes('learning:assessments-mutations:check')) {
    failures.push('package.json doit exposer learning:assessments-mutations:check.');
  }
  if (!ciSource.includes('npm run learning:assessments-mutations:check')) {
    failures.push('La CI doit executer learning:assessments-mutations:check.');
  }
  if (!migrationPlanSource.includes('mutations examens, questions et choix quiz formateur relues ou verifiees via Prisma')) {
    failures.push('Le plan AppRow doit documenter les garde-fous Prisma sur les mutations assessments.');
  }

  const report = { ok: failures.length === 0, checkedMutations: learningMutationContracts.length + 2, failures };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exit(1);
}

main();
