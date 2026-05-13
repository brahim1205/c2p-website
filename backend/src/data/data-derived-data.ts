import type { Row, Store } from './mock-store.js';

export interface RecomputeDerivedDataDeps {
  clone: <T>(value: T) => T;
  compareValues: (left: unknown, right: unknown) => number;
  computeBookingFinancials: (
    price: number | null,
    providerUserId?: string | null,
  ) => {
    commissionRate: number;
    platformFeeAmount: number | null;
    providerPayoutAmount: number | null;
  };
  findRow: (table: string, id: unknown) => Row | undefined;
  getDaysSince: (dateValue: unknown) => number | null;
  normalizeEscrowStatus: (status: unknown, fallback: string) => string;
  normalizeText: (value: unknown) => string;
  parseBoolean: (value: unknown, fallback?: boolean) => boolean;
  requireNumberOrFallback: (value: unknown, fallback: number) => number;
  syncCourseModerationItems: () => void;
  toNumber: (value: unknown) => number | null;
}

export function recomputeDerivedData(store: Store, deps: RecomputeDerivedDataDeps) {
  const {
    clone,
    compareValues,
    computeBookingFinancials,
    findRow,
    getDaysSince,
    normalizeEscrowStatus,
    normalizeText,
    parseBoolean,
    requireNumberOrFallback,
    syncCourseModerationItems,
    toNumber,
  } = deps;

  const courses = store.courses ?? [];
  const courseSections = store.course_sections ?? [];
  const courseLessons = store.course_lessons ?? [];
  const lessonAssets = store.lesson_assets ?? [];
  const enrollments = store.course_enrollments ?? [];
  const reviews = store.provider_reviews ?? [];
  const bookings = store.bookings ?? [];
  const walletAccounts = store.wallet_accounts ?? [];
  const subscriptionPlans = store.subscription_plans ?? [];
  const userSubscriptions = store.user_subscriptions ?? [];
  const escrowCases = store.escrow_cases ?? [];
  const commissionLedger = store.commission_ledger ?? [];
  const providers = store.providers ?? [];
  const services = store.provider_services ?? [];
  const exams = store.exams ?? [];
  const quizQuestions = store.quiz_questions ?? [];
  const quizChoices = store.quiz_choices ?? [];
  const submissions = store.submissions ?? [];
  const certificates = store.certificates ?? [];
  const lessonProgressRows = store.lesson_progress ?? [];
  const courseReviews = store.course_reviews ?? [];
  const virtualClasses = store.virtual_classes ?? [];
  const conversations = store.conversations ?? [];
  const messages = store.messages ?? [];
  const projects = store.projects ?? [];
  const projectMilestones = store.project_milestones ?? [];
  const projectDocuments = store.project_documents ?? [];
  const projectHistory = store.project_history ?? [];
  const projectFundingRounds = store.project_funding_rounds ?? [];
  const projectPartnerships = store.project_partnerships ?? [];
  const projectTracking = store.project_tracking ?? [];
  const projectCollaborations = store.project_collaborations ?? [];
  const fundingInvestors = store.funding_investors ?? [];

  for (const enrollment of enrollments) {
    const course = findRow('courses', enrollment.course_id);
    const courseSectionsForEnrollment = courseSections.filter((section) => String(section.course_id) === String(enrollment.course_id));
    const courseLessonsForEnrollment = courseLessons.filter((lesson) => String(lesson.course_id) === String(enrollment.course_id));
    const lessonProgressForEnrollment = lessonProgressRows.filter(
      (entry) =>
        String(entry.student_id) === String(enrollment.student_id) &&
        String(entry.course_id) === String(enrollment.course_id),
    );
    const courseExamsForEnrollment = exams.filter((exam) => String(exam.course_id) === String(enrollment.course_id));
    const enrollmentSubmissions = submissions.filter((submission) => {
      if (String(submission.student_id) !== String(enrollment.student_id)) return false;
      return courseExamsForEnrollment.some((exam) => String(exam.id) === String(submission.exam_id));
    });
    const gradedSubmissions = enrollmentSubmissions.filter((submission) => submission.grade !== null && submission.grade !== undefined);
    const latestSubmission = clone(enrollmentSubmissions).sort((left, right) => compareValues(right.submitted_at ?? right.created_at, left.submitted_at ?? left.created_at))[0];
    const certificate = certificates.find(
      (item) =>
        String(item.student_id) === String(enrollment.student_id) &&
        String(item.course_id) === String(enrollment.course_id),
    );
    const progressByLesson = new Map<string, number>();
    for (const lesson of courseLessonsForEnrollment) {
      progressByLesson.set(String(lesson.id), 0);
    }
    for (const lessonProgress of lessonProgressForEnrollment) {
      progressByLesson.set(
        String(lessonProgress.lesson_id),
        Math.min(100, Math.max(0, requireNumberOrFallback(lessonProgress.progress, 0))),
      );
    }

    const sectionsCount = courseSectionsForEnrollment.length > 0 ? courseSectionsForEnrollment.length : Math.max(toNumber(course?.modules) ?? 0, 0);
    const lessonsCount = courseLessonsForEnrollment.length;
    const exactCompletedLessons = Array.from(progressByLesson.values()).filter((value) => value >= 100).length;
    const exactCompletedSections = courseSectionsForEnrollment.filter((section) => {
      const sectionLessonIds = courseLessonsForEnrollment
        .filter((lesson) => String(lesson.section_id) === String(section.id))
        .map((lesson) => String(lesson.id));
      if (sectionLessonIds.length === 0) return false;
      return sectionLessonIds.every((lessonId) => (progressByLesson.get(lessonId) ?? 0) >= 100);
    }).length;
    const progressEntriesExist = lessonProgressForEnrollment.length > 0 && lessonsCount > 0;
    const normalizedProgress = progressEntriesExist
      ? Math.round(
          Array.from(progressByLesson.values()).reduce((sum, value) => sum + value, 0) / Math.max(lessonsCount, 1),
        )
      : Math.min(100, Math.max(0, toNumber(enrollment.progress) ?? 0));
    const completedSectionsEstimate = progressEntriesExist
      ? exactCompletedSections
      : (sectionsCount > 0 ? Math.round((normalizedProgress / 100) * sectionsCount) : 0);
    const completedLessonsEstimate = progressEntriesExist
      ? exactCompletedLessons
      : (lessonsCount > 0 ? Math.round((normalizedProgress / 100) * lessonsCount) : 0);
    const latestLessonActivity = clone(lessonProgressForEnrollment)
      .sort((left, right) => compareValues(right.last_viewed_at ?? right.updated_at ?? right.created_at, left.last_viewed_at ?? left.updated_at ?? left.created_at))[0];
    if (latestLessonActivity?.last_viewed_at || latestLessonActivity?.updated_at) {
      enrollment.last_active = latestLessonActivity.last_viewed_at ?? latestLessonActivity.updated_at ?? enrollment.last_active;
    }
    const daysSinceActive = getDaysSince(enrollment.last_active) ?? 0;
    let attentionLevel = 'on_track';

    if (normalizedProgress >= 100 || String(enrollment.status) === 'completed') {
      attentionLevel = 'completed';
    } else if (String(enrollment.status) === 'inactive' || daysSinceActive >= 14 || (daysSinceActive >= 7 && normalizedProgress < 40)) {
      attentionLevel = 'at_risk';
    } else if (daysSinceActive >= 5 || normalizedProgress < 25) {
      attentionLevel = 'watch';
    }

    enrollment.course_name = enrollment.course_name ?? course?.title ?? null;
    enrollment.course_category = enrollment.course_category ?? course?.category ?? null;
    enrollment.progress = normalizedProgress;
    enrollment.status = normalizedProgress >= 100 ? 'completed' : (String(enrollment.status) === 'inactive' ? 'inactive' : 'active');
    enrollment.course_sections_count = sectionsCount;
    enrollment.course_lessons_count = lessonsCount;
    enrollment.completed_sections_estimate = completedSectionsEstimate;
    enrollment.remaining_sections_estimate = Math.max(sectionsCount - completedSectionsEstimate, 0);
    enrollment.completed_lessons_estimate = completedLessonsEstimate;
    enrollment.remaining_lessons_estimate = Math.max(lessonsCount - completedLessonsEstimate, 0);
    enrollment.days_since_active = daysSinceActive;
    enrollment.submissions_count = enrollmentSubmissions.length;
    enrollment.graded_submissions_count = gradedSubmissions.length;
    enrollment.pending_grading_count = enrollmentSubmissions.filter((submission) => String(submission.status) === 'pending').length;
    enrollment.avg_submission_grade = gradedSubmissions.length
      ? Number((gradedSubmissions.reduce((sum, submission) => sum + (toNumber(submission.grade) ?? 0), 0) / gradedSubmissions.length).toFixed(1))
      : null;
    enrollment.latest_submission_at = latestSubmission?.submitted_at ?? latestSubmission?.created_at ?? null;
    enrollment.attention_level = attentionLevel;
    enrollment.certificate_status = certificate?.status ?? (normalizedProgress >= 100 ? 'ready' : 'pending');
    enrollment.certificate_issued_at = certificate?.issued_at ?? null;
    enrollment.certificate_number = certificate?.certificate_number ?? certificate?.certificate_id ?? null;
  }

  for (const course of courses) {
    const courseEnrollments = enrollments.filter((enrollment) => String(enrollment.course_id) === String(course.id));
    const courseStudents = new Set(courseEnrollments.map((enrollment) => String(enrollment.student_id)));
    const totalProgress = courseEnrollments.reduce((sum, enrollment) => sum + (toNumber(enrollment.progress) ?? 0), 0);
    const price = toNumber(course.price) ?? 0;
    const sections = courseSections.filter((section) => String(section.course_id) === String(course.id));
    const lessons = courseLessons.filter((lesson) => String(lesson.course_id) === String(course.id));
    const assets = lessonAssets.filter((asset) => String(asset.course_id) === String(course.id));
    const reviewsForCourse = courseReviews.filter((review) => String(review.course_id) === String(course.id) && String(review.status ?? 'published') === 'published');
    const avgRating = reviewsForCourse.length
      ? reviewsForCourse.reduce((sum, review) => sum + (toNumber(review.rating) ?? 0), 0) / reviewsForCourse.length
      : toNumber(course.rating) ?? 0;

    course.students_count = courseStudents.size;
    course.completion_rate = courseEnrollments.length ? Math.round(totalProgress / courseEnrollments.length) : 0;
    course.revenue = courseStudents.size * price;
    course.modules = sections.length > 0 ? sections.length : Math.max(toNumber(course.modules) ?? 0, 1);
    course.lessons_count = lessons.length;
    course.preview_lessons_count = lessons.filter((lesson) => Boolean(lesson.is_preview)).length;
    course.published_lessons_count = lessons.filter((lesson) => String(lesson.status) === 'published').length;
    course.assets_count = assets.length;
    course.rating = Number(avgRating.toFixed(1));
    course.reviews = reviewsForCourse.length;
    course.reviews_count = reviewsForCourse.length;
  }

  for (const section of courseSections) {
    const course = findRow('courses', section.course_id);
    const lessons = courseLessons.filter((lesson) => String(lesson.section_id) === String(section.id));
    section.course_name = section.course_name ?? course?.title ?? null;
    section.instructor_id = section.instructor_id ?? course?.instructor_id ?? null;
    section.lessons_count = lessons.length;
  }

  for (const lesson of courseLessons) {
    const course = findRow('courses', lesson.course_id);
    const section = findRow('course_sections', lesson.section_id);
    const assets = lessonAssets.filter((asset) => String(asset.lesson_id) === String(lesson.id));
    lesson.course_name = lesson.course_name ?? course?.title ?? null;
    lesson.section_title = lesson.section_title ?? section?.title ?? null;
    lesson.instructor_id = lesson.instructor_id ?? course?.instructor_id ?? null;
    lesson.assets_count = assets.length;
  }

  for (const asset of lessonAssets) {
    const course = findRow('courses', asset.course_id);
    const section = findRow('course_sections', asset.section_id);
    const lesson = findRow('course_lessons', asset.lesson_id);
    asset.course_name = asset.course_name ?? course?.title ?? null;
    asset.section_title = asset.section_title ?? section?.title ?? null;
    asset.lesson_title = asset.lesson_title ?? lesson?.title ?? null;
    asset.instructor_id = asset.instructor_id ?? course?.instructor_id ?? null;
  }

  syncCourseModerationItems();

  for (const booking of bookings) {
    const provider = findRow('providers', booking.provider_id ?? booking.requested_provider_id);
    const financials = computeBookingFinancials(
      booking.price === null || booking.price === undefined ? null : requireNumberOrFallback(booking.price, 0),
      typeof provider?.user_id === 'string' ? provider.user_id : null,
    );
    booking.request_channel = booking.request_channel ?? 'c2p_managed';
    booking.assignment_status = booking.assignment_status ?? (booking.provider_id ? 'assigned' : 'pending_review');
    booking.wallet_flow = booking.wallet_flow ?? 'escrow';
    booking.platform_fee_amount = financials.platformFeeAmount;
    booking.provider_payout_amount = financials.providerPayoutAmount;
    booking.commission_rate = financials.commissionRate;
    if (provider) {
      booking.requested_provider_name = booking.requested_provider_name ?? provider.name ?? null;
    }
  }

  for (const plan of subscriptionPlans) {
    plan.currency = plan.currency ?? 'XAF';
    plan.price_monthly = requireNumberOrFallback(plan.price_monthly, 0);
    plan.commission_rate = requireNumberOrFallback(plan.commission_rate, 0);
    plan.features = Array.isArray(plan.features) ? plan.features : [];
    plan.active = Boolean(plan.active ?? true);
  }

  for (const subscription of userSubscriptions) {
    const plan = findRow('subscription_plans', subscription.plan_id);
    subscription.role = subscription.role ?? plan?.role ?? null;
    subscription.plan_name = subscription.plan_name ?? plan?.name ?? null;
    subscription.amount = requireNumberOrFallback(subscription.amount, requireNumberOrFallback(plan?.price_monthly, 0));
    subscription.currency = subscription.currency ?? plan?.currency ?? 'XAF';
    subscription.commission_rate = requireNumberOrFallback(subscription.commission_rate, requireNumberOrFallback(plan?.commission_rate, 0));
    subscription.auto_renew = parseBoolean(subscription.auto_renew, true);
    if (String(subscription.status) !== 'cancelled') {
      const renewsAt = typeof subscription.renews_at === 'string' ? Date.parse(subscription.renews_at) : Number.NaN;
      if (!Number.isNaN(renewsAt) && renewsAt < Date.now()) {
        subscription.status = 'expired';
      } else {
        subscription.status = subscription.status ?? 'active';
      }
    }
  }

  for (const escrow of escrowCases) {
    const booking = findRow('bookings', escrow.booking_id);
    const provider = findRow('providers', escrow.provider_id ?? booking?.provider_id ?? escrow.requested_provider_id);
    escrow.service = escrow.service ?? booking?.service ?? null;
    escrow.client_id = escrow.client_id ?? booking?.client_id ?? null;
    escrow.provider_id = escrow.provider_id ?? booking?.provider_id ?? null;
    escrow.provider_user_id = escrow.provider_user_id ?? provider?.user_id ?? null;
    escrow.requested_provider_id = escrow.requested_provider_id ?? booking?.requested_provider_id ?? null;
    escrow.currency = escrow.currency ?? 'XAF';
    escrow.status = normalizeEscrowStatus(escrow.status, booking?.price ? 'awaiting_funding' : 'awaiting_quote');
    escrow.amount_total = requireNumberOrFallback(escrow.amount_total, requireNumberOrFallback(booking?.price, 0));
    escrow.platform_fee_amount = requireNumberOrFallback(escrow.platform_fee_amount, requireNumberOrFallback(booking?.platform_fee_amount, 0));
    escrow.provider_amount = requireNumberOrFallback(escrow.provider_amount, requireNumberOrFallback(booking?.provider_payout_amount, 0));
  }

  for (const wallet of walletAccounts) {
    const userId = String(wallet.user_id ?? '');
    wallet.currency = wallet.currency ?? 'XAF';
    wallet.pending_payout_amount = getPendingPayoutReservations(userId, store, requireNumberOrFallback);
    wallet.available_balance = Math.max(0, requireNumberOrFallback(wallet.balance, 0) - requireNumberOrFallback(wallet.pending_payout_amount, 0));
    wallet.held_balance = escrowCases
      .filter((entry) => String(entry.client_id) === userId && new Set(['funded', 'assigned', 'in_progress', 'delivery_review']).has(String(entry.status)))
      .reduce((sum, entry) => sum + requireNumberOrFallback(entry.amount_total, 0), 0);
    wallet.pending_release_balance = escrowCases
      .filter((entry) => String(entry.provider_user_id) === userId && new Set(['assigned', 'in_progress', 'delivery_review']).has(String(entry.status)))
      .reduce((sum, entry) => sum + requireNumberOrFallback(entry.provider_amount, 0), 0);
    const activeSubscription = userSubscriptions.find((entry) => String(entry.user_id) === userId && String(entry.status) === 'active');
    wallet.subscription_plan_name = activeSubscription?.plan_name ?? null;
    wallet.subscription_status = activeSubscription?.status ?? null;
  }

  for (const entry of commissionLedger) {
    if (String(entry.source_type) === 'booking') {
      const booking = findRow('bookings', entry.source_id);
      entry.amount = requireNumberOrFallback(entry.amount, requireNumberOrFallback(booking?.platform_fee_amount, 0));
      entry.description = entry.description ?? `Commission C2P sur ${String(booking?.service ?? 'mission')}`;
    }
    if (String(entry.source_type) === 'subscription') {
      const subscription = findRow('user_subscriptions', entry.source_id);
      entry.amount = requireNumberOrFallback(entry.amount, requireNumberOrFallback(subscription?.amount, 0));
      entry.description = entry.description ?? `Abonnement ${String(subscription?.plan_name ?? 'C2P')}`;
    }
    entry.currency = entry.currency ?? 'XAF';
    entry.status = entry.status ?? 'recognized';
    entry.recognized_at = entry.recognized_at ?? new Date().toISOString();
  }

  for (const provider of providers) {
    const providerReviews = reviews.filter((review) => String(review.provider_id) === String(provider.id));
    const providerBookings = bookings.filter((booking) => String(booking.provider_id) === String(provider.id));
    const completedBookings = providerBookings.filter((booking) => booking.status === 'completed').length;
    const avgRating = providerReviews.length
      ? providerReviews.reduce((sum, review) => sum + (toNumber(review.rating) ?? 0), 0) / providerReviews.length
      : toNumber(provider.rating) ?? 0;

    provider.rating = Number(avgRating.toFixed(1));
    provider.reviews = providerReviews.length;
    provider.reviews_count = providerReviews.length;
    provider.completed_jobs = Math.max(toNumber(provider.completed_jobs) ?? 0, completedBookings);
  }

  for (const service of services) {
    const matchingBookings = bookings.filter(
      (booking) =>
        String(booking.provider_id) === String(service.provider_id) &&
        (normalizeText(booking.service) === normalizeText(service.title) ||
          normalizeText(booking.service).includes(normalizeText(service.title)) ||
          normalizeText(service.title).includes(normalizeText(booking.service))),
    );
    const matchingReviews = reviews.filter(
      (review) =>
        String(review.provider_id) === String(service.provider_id) &&
        normalizeText(review.service) === normalizeText(service.title),
    );
    const avgRating = matchingReviews.length
      ? matchingReviews.reduce((sum, review) => sum + (toNumber(review.rating) ?? 0), 0) / matchingReviews.length
      : 0;

    service.bookings = matchingBookings.length;
    service.rating = Number(avgRating.toFixed(1));
  }

  for (const exam of exams) {
    const examSubmissions = submissions.filter((submission) => String(submission.exam_id) === String(exam.id));
    const questions = quizQuestions.filter((question) => String(question.exam_id) === String(exam.id));
    const graded = examSubmissions.filter((submission) => submission.grade !== null && submission.grade !== undefined);
    const avgGrade = graded.length
      ? graded.reduce((sum, submission) => sum + (toNumber(submission.grade) ?? 0), 0) / graded.length
      : null;
    const course = findRow('courses', exam.course_id);

    exam.course_name = exam.course_name ?? course?.title ?? null;
    exam.instructor_id = exam.instructor_id ?? course?.instructor_id ?? null;
    exam.submitted = examSubmissions.length;
    exam.participants = Math.max(toNumber(exam.participants) ?? 0, examSubmissions.length);
    exam.avg_grade = avgGrade === null ? null : Number(avgGrade.toFixed(1));
    exam.questions_count = questions.length;
    exam.open_questions_count = questions.filter((question) => String(question.type) === 'open').length;
    exam.auto_gradable = exam.open_questions_count === 0;

    if (String(exam.type) === 'quiz' && questions.length > 0) {
      exam.max_grade = questions.reduce((sum, question) => sum + (toNumber(question.points) ?? 0), 0);
    }
  }

  for (const question of quizQuestions) {
    const exam = findRow('exams', question.exam_id);
    const course = findRow('courses', question.course_id ?? exam?.course_id);
    const choices = quizChoices.filter((choice) => String(choice.question_id) === String(question.id));
    question.exam_title = question.exam_title ?? exam?.title ?? null;
    question.course_id = question.course_id ?? exam?.course_id ?? null;
    question.course_name = question.course_name ?? course?.title ?? null;
    question.instructor_id = question.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
    question.required = question.required ?? true;
    question.choices_count = choices.length;
    question.correct_choices_count = choices.filter((choice) => Boolean(choice.is_correct)).length;
  }

  for (const choice of quizChoices) {
    const question = findRow('quiz_questions', choice.question_id);
    const exam = findRow('exams', choice.exam_id ?? question?.exam_id);
    const course = findRow('courses', choice.course_id ?? question?.course_id ?? exam?.course_id);
    choice.question_prompt = choice.question_prompt ?? question?.prompt ?? null;
    choice.question_type = choice.question_type ?? question?.type ?? null;
    choice.exam_id = choice.exam_id ?? question?.exam_id ?? null;
    choice.exam_title = choice.exam_title ?? exam?.title ?? null;
    choice.course_id = choice.course_id ?? question?.course_id ?? exam?.course_id ?? null;
    choice.course_name = choice.course_name ?? course?.title ?? null;
    choice.instructor_id = choice.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
  }

  for (const certificate of certificates) {
    const course = findRow('courses', certificate.course_id);
    certificate.course_name = certificate.course_name ?? course?.title ?? null;
    certificate.title = certificate.title ?? certificate.course_name ?? null;
    certificate.grade = certificate.grade ?? certificate.final_grade ?? null;
    certificate.final_grade = certificate.final_grade ?? certificate.grade ?? null;
    certificate.certificate_number = certificate.certificate_number ?? certificate.certificate_id ?? null;
  }

  for (const vclass of virtualClasses) {
    const course = findRow('courses', vclass.course_id);
    const relatedEnrollments = enrollments.filter((enrollment) => String(enrollment.course_id) === String(vclass.course_id));
    vclass.course_name = vclass.course_name ?? course?.title ?? null;
    vclass.students_count = Math.max(toNumber(vclass.students_count) ?? 0, relatedEnrollments.length);
  }

  for (const conversation of conversations) {
    const conversationMessages = messages
      .filter((message) => String(message.conversation_id) === String(conversation.id))
      .sort((left, right) => compareValues(left.created_at, right.created_at));
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    conversation.updated_at = lastMessage?.created_at ?? conversation.updated_at ?? conversation.created_at;
  }

  for (const project of projects) {
    const docs = projectDocuments.filter((document) => String(document.project_id) === String(project.id));
    const history = projectHistory.filter((entry) => String(entry.project_id) === String(project.id));
    const milestones = projectMilestones.filter((milestone) => String(milestone.project_id) === String(project.id));
    const partnerships = projectPartnerships.filter((partnership) => String(partnership.project_id) === String(project.id));
    const progressFromFunding = (toNumber(project.funding_goal) ?? 0) > 0
      ? Math.round(((toNumber(project.funding) ?? 0) / (toNumber(project.funding_goal) ?? 1)) * 100)
      : 0;
    const pendingMilestone = milestones
      .filter((milestone) => milestone.status !== 'completed')
      .sort((left, right) => compareValues(left.due_date, right.due_date))[0];
    const latestHistory = history.sort((left, right) => compareValues(right.date, left.date))[0];

    project.sector = project.sector ?? project.category ?? null;
    project.progress = Math.max(toNumber(project.progress) ?? 0, progressFromFunding);
    project.documents_count = docs.length;
    project.reports_count = docs.filter((document) => normalizeText(document.category) === 'report').length;
    project.partnerships_count = partnerships.length;
    project.last_update = project.last_update ?? latestHistory?.date ?? project.created_at;
    project.next_milestone = project.next_milestone ?? pendingMilestone?.title ?? null;
  }

  for (const round of projectFundingRounds) {
    const project = findRow('projects', round.project_id);
    const investors = fundingInvestors.filter((investor) => String(investor.funding_round_id) === String(round.id));
    round.project_title = round.project_title ?? project?.title ?? null;
    round.project_name = round.project_name ?? project?.title ?? null;
    round.investors = investors.length;
    round.progress_percent = (toNumber(round.target_amount) ?? 0) > 0
      ? Math.round(((toNumber(round.raised_amount) ?? 0) / (toNumber(round.target_amount) ?? 1)) * 100)
      : 0;
  }

  for (const tracking of projectTracking) {
    const project = findRow('projects', tracking.project_id);
    tracking.title = tracking.title ?? project?.title ?? null;
    tracking.description = tracking.description ?? project?.description ?? null;
    tracking.sector = tracking.sector ?? project?.sector ?? project?.category ?? null;
    tracking.progress = project?.progress ?? tracking.progress ?? 0;
    tracking.documents = project?.documents_count ?? tracking.documents ?? 0;
    tracking.reports = project?.reports_count ?? tracking.reports ?? 0;
    tracking.location = tracking.location ?? project?.location ?? null;
    tracking.impact = tracking.impact ?? project?.impact ?? null;
    tracking.team_size = tracking.team_size ?? project?.team_size ?? null;
    tracking.revenue = tracking.revenue ?? project?.revenue ?? 0;
    tracking.valuation = tracking.valuation ?? project?.valuation ?? 0;
    tracking.next_milestone = tracking.next_milestone ?? project?.next_milestone ?? null;
    tracking.last_update = tracking.last_update ?? project?.last_update ?? project?.created_at;
  }

  for (const collaboration of projectCollaborations) {
    const project = findRow('projects', collaboration.project_id);
    collaboration.project_title = collaboration.project_title ?? project?.title ?? null;
  }
}

function getPendingPayoutReservations(userId: string, store: Store, requireNumberOrFallback: (value: unknown, fallback: number) => number) {
  return (store.payout_requests ?? [])
    .filter((entry) => String(entry.user_id) === userId && String(entry.status ?? 'pending') === 'pending')
    .reduce((sum, entry) => sum + requireNumberOrFallback(entry.amount, 0), 0);
}
