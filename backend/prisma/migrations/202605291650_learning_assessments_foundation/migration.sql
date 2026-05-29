CREATE TABLE "LearningExam" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT,
    "instructorId" TEXT,
    "title" TEXT NOT NULL,
    "examType" TEXT NOT NULL DEFAULT 'quiz',
    "examDate" TIMESTAMP(3),
    "participants" INTEGER NOT NULL DEFAULT 0,
    "submitted" INTEGER NOT NULL DEFAULT 0,
    "avgGrade" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "maxGrade" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "instructions" TEXT,
    "attachments" JSONB,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningQuizQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "courseId" TEXT,
    "instructorId" TEXT,
    "prompt" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'single_choice',
    "points" INTEGER NOT NULL DEFAULT 1,
    "explanation" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningQuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningQuizChoice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "courseId" TEXT,
    "instructorId" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningQuizChoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningSubmission" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "courseId" TEXT,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT,
    "studentAvatar" TEXT,
    "submittedAt" TIMESTAMP(3),
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileName" TEXT,
    "fileUrl" TEXT,
    "answers" JSONB,
    "gradedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningCertificate" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT,
    "studentAvatar" TEXT,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT,
    "title" TEXT,
    "completionDate" TIMESTAMP(3),
    "finalGrade" DOUBLE PRECISION,
    "grade" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "certificateId" TEXT,
    "certificateNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCertificate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningExam_courseId_status_idx" ON "LearningExam"("courseId", "status");
CREATE INDEX "LearningExam_instructorId_status_idx" ON "LearningExam"("instructorId", "status");
CREATE INDEX "LearningExam_source_idx" ON "LearningExam"("source");
CREATE INDEX "LearningQuizQuestion_examId_position_idx" ON "LearningQuizQuestion"("examId", "position");
CREATE INDEX "LearningQuizQuestion_courseId_idx" ON "LearningQuizQuestion"("courseId");
CREATE INDEX "LearningQuizQuestion_source_idx" ON "LearningQuizQuestion"("source");
CREATE INDEX "LearningQuizChoice_questionId_position_idx" ON "LearningQuizChoice"("questionId", "position");
CREATE INDEX "LearningQuizChoice_examId_position_idx" ON "LearningQuizChoice"("examId", "position");
CREATE INDEX "LearningQuizChoice_source_idx" ON "LearningQuizChoice"("source");
CREATE INDEX "LearningSubmission_examId_status_idx" ON "LearningSubmission"("examId", "status");
CREATE INDEX "LearningSubmission_studentId_submittedAt_idx" ON "LearningSubmission"("studentId", "submittedAt");
CREATE INDEX "LearningSubmission_source_idx" ON "LearningSubmission"("source");
CREATE INDEX "LearningCertificate_studentId_status_idx" ON "LearningCertificate"("studentId", "status");
CREATE INDEX "LearningCertificate_courseId_status_idx" ON "LearningCertificate"("courseId", "status");
CREATE INDEX "LearningCertificate_source_idx" ON "LearningCertificate"("source");
