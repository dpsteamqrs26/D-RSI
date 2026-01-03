// db/schema.ts
import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, serial } from 'drizzle-orm/pg-core';

// Admin table
export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Quiz table
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  createdBy: text('created_by').notNull(), // Admin email
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// Question table
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  options: jsonb('options').notNull(), // Array of options: [{id: string, text: string}]
  correctOptionId: text('correct_option_id').notNull(),
  order: integer('order').notNull(),
});

// Quiz attempts table
export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Clerk user ID
  userEmail: text('user_email').notNull(),
  userName: text('user_name'),
  answers: jsonb('answers').notNull(), // {questionId: selectedOptionId}
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

// Correct answers table - tracks each correct answer by users
export const correctAnswers = pgTable('correct_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').notNull().references(() => attempts.id, { onDelete: 'cascade' }),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Clerk user ID
  userEmail: text('user_email').notNull(),
  userName: text('user_name'),
  selectedOptionId: text('selected_option_id').notNull(),
  correctOptionId: text('correct_option_id').notNull(),
  answeredAt: timestamp('answered_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').unique().notNull(), // Link to Clerk Auth
  xp: integer('xp').default(0),
  currentLevel: text('current_level').default('RED'), // 'RED' (0-499 XP), 'YELLOW' (500-1499 XP), 'GREEN' (1500+ XP)
  lastQuizAttempt: timestamp('last_quiz_attempt'),
  streak: integer('streak').default(0),
});

// Courses table - learning content organized by level
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  levelRequirement: text('level_requirement').default('RED'), // 'RED', 'YELLOW', 'GREEN'
  pointsAwarded: integer('points_awarded').default(50),
  imageUrl: text('image_url'),
  order: integer('order').default(0), // Display order
  createdBy: text('created_by').notNull(), // Admin email
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// Lessons table - individual lessons within a course
export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(), // Main lesson content (markdown supported)
  order: integer('order').default(0), // Lesson order within course
  xpReward: integer('xp_reward').default(25), // XP earned on completion
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User lesson progress - tracks completed lessons
export const userLessonProgress = pgTable('user_lesson_progress', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').notNull(),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
  xpEarned: integer('xp_earned').default(0),
});

// User course progress - tracks overall course completion
export const userCourseProgress = pgTable('user_course_progress', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').notNull(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  completedLessons: integer('completed_lessons').default(0),
  totalLessons: integer('total_lessons').default(0),
  isCompleted: boolean('is_completed').default(false),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;
export type CorrectAnswer = typeof correctAnswers.$inferSelect;
export type NewCorrectAnswer = typeof correctAnswers.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;