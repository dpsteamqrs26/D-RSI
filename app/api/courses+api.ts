// app/api/courses+api.ts
import { db } from '@/db';
import { courses, lessons, userLessonProgress, userCourseProgress, users, admins } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

// XP thresholds for levels
const LEVEL_THRESHOLDS = {
  RED: 0,
  YELLOW: 500,
  GREEN: 1500,
};

// Calculate level from XP
function calculateLevel(xp: number): 'RED' | 'YELLOW' | 'GREEN' {
  if (xp >= LEVEL_THRESHOLDS.GREEN) return 'GREEN';
  if (xp >= LEVEL_THRESHOLDS.YELLOW) return 'YELLOW';
  return 'RED';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get('clerkId');
    const courseId = url.searchParams.get('courseId');

    console.log('[API] Courses GET - clerkId:', clerkId, 'courseId:', courseId);

    // Get single course with lessons
    if (courseId && !isNaN(parseInt(courseId))) {
      const parsedCourseId = parseInt(courseId);
      const courseData = await db
        .select()
        .from(courses)
        .where(eq(courses.id, parsedCourseId))
        .limit(1);

      if (courseData.length === 0) {
        return Response.json({ error: 'Course not found' }, { status: 404 });
      }

      const courseLessons = await db
        .select()
        .from(lessons)
        .where(eq(lessons.courseId, parsedCourseId))
        .orderBy(asc(lessons.order));

      // Get user progress if clerkId provided
      let completedLessonIds: number[] = [];
      if (clerkId && clerkId !== 'null' && clerkId !== '') {
        const progress = await db
          .select()
          .from(userLessonProgress)
          .where(
            and(
              eq(userLessonProgress.clerkId, clerkId),
              eq(userLessonProgress.courseId, parsedCourseId)
            )
          );
        completedLessonIds = progress.map((p) => p.lessonId);
      }

      return Response.json({
        success: true,
        course: courseData[0],
        lessons: courseLessons,
        completedLessonIds,
      });
    }

    // Get all courses with user progress
    console.log('[API] Fetching all courses...');
    const allCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.isActive, true))
      .orderBy(asc(courses.order));

    console.log('[API] Found courses:', allCourses.length);

    // Get user data if clerkId provided
    let userData = null;
    let userProgressData: any[] = [];
    if (clerkId && clerkId !== 'null' && clerkId !== '') {
      console.log('[API] Fetching progress for clerkId:', clerkId);
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);
      
      if (userResult.length > 0) {
        userData = userResult[0];
      }

      userProgressData = await db
        .select()
        .from(userCourseProgress)
        .where(eq(userCourseProgress.clerkId, clerkId));
    }

    return Response.json({
      success: true,
      courses: allCourses,
      user: userData,
      userProgress: userProgressData,
    });
  } catch (error) {
    console.error('[API ERROR] Courses GET failed:', error);
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Server error',
        details: String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type } = body;

    // Create new course (admin only)
    if (type === 'create-course') {
      const { userEmail, title, description, levelRequirement, pointsAwarded, imageUrl } = body;

      // Verify admin
      const adminCheck = await db
        .select()
        .from(admins)
        .where(eq(admins.email, userEmail))
        .limit(1);

      if (adminCheck.length === 0) {
        return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
      }

      const newCourse = await db.insert(courses).values({
        title,
        description,
        levelRequirement: levelRequirement || 'RED',
        pointsAwarded: pointsAwarded || 50,
        imageUrl,
        createdBy: userEmail,
      }).returning();

      return Response.json({ success: true, course: newCourse[0] });
    }

    // Add lesson to course (admin only)
    if (type === 'add-lesson') {
      const { userEmail, courseId, title, content, xpReward, order } = body;

      // Verify admin
      const adminCheck = await db
        .select()
        .from(admins)
        .where(eq(admins.email, userEmail))
        .limit(1);

      if (adminCheck.length === 0) {
        return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
      }

      const newLesson = await db.insert(lessons).values({
        courseId,
        title,
        content,
        xpReward: xpReward || 25,
        order: order || 0,
      }).returning();

      return Response.json({ success: true, lesson: newLesson[0] });
    }

    // Complete a lesson
    if (type === 'complete-lesson') {
      const { clerkId, lessonId, courseId } = body;

      // Check if already completed
      const existingProgress = await db
        .select()
        .from(userLessonProgress)
        .where(
          and(
            eq(userLessonProgress.clerkId, clerkId),
            eq(userLessonProgress.lessonId, lessonId)
          )
        )
        .limit(1);

      if (existingProgress.length > 0) {
        return Response.json({ success: true, message: 'Already completed' });
      }

      // Get lesson XP reward
      const lessonData = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1);

      if (lessonData.length === 0) {
        return Response.json({ error: 'Lesson not found' }, { status: 404 });
      }

      const xpEarned = lessonData[0].xpReward || 25;

      // Record lesson completion
      await db.insert(userLessonProgress).values({
        clerkId,
        lessonId,
        courseId,
        xpEarned,
      });

      // Update or create user XP
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);

      let newXp = xpEarned;
      if (userData.length > 0) {
        newXp = (userData[0].xp || 0) + xpEarned;
        const newLevel = calculateLevel(newXp);
        await db
          .update(users)
          .set({ xp: newXp, currentLevel: newLevel })
          .where(eq(users.clerkId, clerkId));
      } else {
        const newLevel = calculateLevel(newXp);
        await db.insert(users).values({
          clerkId,
          xp: newXp,
          currentLevel: newLevel,
        });
      }

      // Update course progress
      const allCourseLessons = await db
        .select()
        .from(lessons)
        .where(eq(lessons.courseId, courseId));

      const completedLessons = await db
        .select()
        .from(userLessonProgress)
        .where(
          and(
            eq(userLessonProgress.clerkId, clerkId),
            eq(userLessonProgress.courseId, courseId)
          )
        );

      const existingCourseProgress = await db
        .select()
        .from(userCourseProgress)
        .where(
          and(
            eq(userCourseProgress.clerkId, clerkId),
            eq(userCourseProgress.courseId, courseId)
          )
        )
        .limit(1);

      const isCompleted = completedLessons.length >= allCourseLessons.length;

      if (existingCourseProgress.length > 0) {
        await db
          .update(userCourseProgress)
          .set({
            completedLessons: completedLessons.length,
            totalLessons: allCourseLessons.length,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          })
          .where(
            and(
              eq(userCourseProgress.clerkId, clerkId),
              eq(userCourseProgress.courseId, courseId)
            )
          );
      } else {
        await db.insert(userCourseProgress).values({
          clerkId,
          courseId,
          completedLessons: completedLessons.length,
          totalLessons: allCourseLessons.length,
          isCompleted,
          completedAt: isCompleted ? new Date() : undefined,
        });
      }

      return Response.json({
        success: true,
        xpEarned,
        totalXp: newXp,
        level: calculateLevel(newXp),
      });
    }

    return Response.json({ error: 'Invalid request type' }, { status: 400 });
  } catch (error) {
    console.error('Error in courses POST:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
