CREATE TABLE "LearningCourseEnrollment" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseName" TEXT,
  "courseCategory" TEXT,
  "courseLessonsCount" INTEGER NOT NULL DEFAULT 0,
  "studentId" TEXT NOT NULL,
  "studentName" TEXT,
  "studentEmail" TEXT,
  "studentAvatar" TEXT,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grade" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastActiveAt" TIMESTAMP(3),
  "enrolledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningCourseEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningCourseEnrollment_studentId_status_idx" ON "LearningCourseEnrollment"("studentId", "status");
CREATE INDEX "LearningCourseEnrollment_courseId_status_idx" ON "LearningCourseEnrollment"("courseId", "status");
CREATE INDEX "LearningCourseEnrollment_source_idx" ON "LearningCourseEnrollment"("source");

CREATE TABLE "LearningLessonProgress" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sectionId" TEXT,
  "lessonId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "studentName" TEXT,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "bookmarked" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "videoPositionSeconds" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "firstViewedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningLessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningLessonProgress_studentId_courseId_idx" ON "LearningLessonProgress"("studentId", "courseId");
CREATE INDEX "LearningLessonProgress_lessonId_studentId_idx" ON "LearningLessonProgress"("lessonId", "studentId");
CREATE INDEX "LearningLessonProgress_courseId_status_idx" ON "LearningLessonProgress"("courseId", "status");
CREATE INDEX "LearningLessonProgress_source_idx" ON "LearningLessonProgress"("source");
