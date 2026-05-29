CREATE TABLE "LearningCourse" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "programBranch" TEXT,
  "level" TEXT,
  "description" TEXT,
  "instructorId" TEXT,
  "deliveryMode" TEXT,
  "modules" INTEGER NOT NULL DEFAULT 0,
  "duration" TEXT,
  "price" INTEGER,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "studentsCount" INTEGER NOT NULL DEFAULT 0,
  "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "revenue" INTEGER NOT NULL DEFAULT 0,
  "thumbnail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningCourse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningCourse_status_category_idx" ON "LearningCourse"("status", "category");
CREATE INDEX "LearningCourse_instructorId_status_idx" ON "LearningCourse"("instructorId", "status");
CREATE INDEX "LearningCourse_source_idx" ON "LearningCourse"("source");

CREATE TABLE "LearningCourseSection" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "instructorId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningCourseSection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningCourseSection_courseId_status_position_idx" ON "LearningCourseSection"("courseId", "status", "position");
CREATE INDEX "LearningCourseSection_instructorId_status_idx" ON "LearningCourseSection"("instructorId", "status");
CREATE INDEX "LearningCourseSection_source_idx" ON "LearningCourseSection"("source");

CREATE TABLE "LearningCourseLesson" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sectionId" TEXT,
  "instructorId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "lessonType" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "duration" TEXT,
  "isPreview" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningCourseLesson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningCourseLesson_courseId_status_position_idx" ON "LearningCourseLesson"("courseId", "status", "position");
CREATE INDEX "LearningCourseLesson_sectionId_status_position_idx" ON "LearningCourseLesson"("sectionId", "status", "position");
CREATE INDEX "LearningCourseLesson_instructorId_status_idx" ON "LearningCourseLesson"("instructorId", "status");
CREATE INDEX "LearningCourseLesson_source_idx" ON "LearningCourseLesson"("source");

CREATE TABLE "LearningCourseReview" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "studentId" TEXT,
  "studentName" TEXT,
  "studentAvatar" TEXT,
  "rating" INTEGER NOT NULL DEFAULT 0,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningCourseReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningCourseReview_courseId_status_createdAt_idx" ON "LearningCourseReview"("courseId", "status", "createdAt");
CREATE INDEX "LearningCourseReview_studentId_createdAt_idx" ON "LearningCourseReview"("studentId", "createdAt");
CREATE INDEX "LearningCourseReview_source_idx" ON "LearningCourseReview"("source");

CREATE TABLE "LearningVirtualClass" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "courseName" TEXT,
  "classDate" TEXT,
  "classTime" TEXT,
  "duration" TEXT,
  "studentsCount" INTEGER NOT NULL DEFAULT 0,
  "maxStudents" INTEGER,
  "provider" TEXT,
  "meetingSlug" TEXT,
  "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "recordingStatus" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "recordingUrl" TEXT,
  "roomLink" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningVirtualClass_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningVirtualClass_courseId_status_idx" ON "LearningVirtualClass"("courseId", "status");
CREATE INDEX "LearningVirtualClass_classDate_classTime_idx" ON "LearningVirtualClass"("classDate", "classTime");
CREATE INDEX "LearningVirtualClass_source_idx" ON "LearningVirtualClass"("source");
