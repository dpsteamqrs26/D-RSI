// app/api/quizzes+api.ts
import { quizzes, questions, attempts, correctAnswers, type Attempt } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const quizId = url.searchParams.get('quizId');

    console.log('GET /api/quizzes - userId:', userId, 'quizId:', quizId);

    // Get specific quiz with questions
    if (quizId) {
      const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
      
      if (quiz.length === 0) {
        return Response.json({ error: 'Quiz not found in DB' }, { status: 404 });
      }

      const quizQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.quizId, quizId))
        .orderBy(questions.order);

      // Remove correct answers from response
      const sanitizedQuestions = quizQuestions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        order: q.order,
      }));

      return Response.json({
        quiz: quiz[0],
        questions: sanitizedQuestions,
      });
    }

    // Get all active quizzes
    const allQuizzes = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.isActive, true))
      .orderBy(desc(quizzes.createdAt));

    // Get user's attempts if userId provided
    let userAttempts: Attempt[] = [];
    if (userId) {
      userAttempts = await db
        .select()
        .from(attempts)
        .where(eq(attempts.userId, userId))
        .orderBy(desc(attempts.completedAt));
    }

    return Response.json({
      quizzes: allQuizzes,
      attempts: userAttempts,
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return Response.json(
      { error: 'Failed to fetch quizzes', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, userEmail, userId } = body;

    console.log('POST /api/quizzes - type:', type, 'userEmail:', userEmail);

    // Check if user is admin
    const isAdmin = userEmail === 'achyutkpaliwal@gmail.com' || userEmail === 'dpsteamqrs26@gmail.com' || userEmail === 'hishaam259@gmail.com';

    if (type === 'create-quiz' && isAdmin) {
      const { title, description, durationMinutes, questions: quizQuestions } = body;

      // Create quiz
      const [newQuiz] = await db
        .insert(quizzes)
        .values({
          title,
          description,
          durationMinutes,
          createdBy: userEmail,
        })
        .returning();

      // Create questions
      const questionPromises = quizQuestions.map((q: any, index: number) =>
        db.insert(questions).values({
          quizId: newQuiz.id,
          questionText: q.questionText,
          options: q.options,
          correctOptionId: q.correctOptionId,
          order: index,
        })
        .returning()
      );

      await Promise.all(questionPromises);

      return Response.json({ success: true, quiz: newQuiz });
    }

    if (type === 'submit-attempt') {
      const { quizId, answers, startedAt, userName, userEmail } = body;

      // Get quiz questions with correct answers
      const quizQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.quizId, quizId));

      // Calculate score
      let score = 0;
      quizQuestions.forEach(q => {
        if (answers[q.id] === q.correctOptionId) {
          score++;
        }
      });

      // Save attempt
      const [newAttempt] = await db
        .insert(attempts)
        .values({
          quizId,
          userId,
          userEmail,
          userName,
          answers,
          score,
          totalQuestions: quizQuestions.length,
          startedAt: new Date(startedAt),
        })
        .returning();

      // Insert correct answers into correctAnswers table
      const correctAnswerRecords = quizQuestions
        .filter(q => answers[q.id] === q.correctOptionId)
        .map(q => ({
          attemptId: newAttempt.id,
          quizId: quizId,
          questionId: q.id,
          userId: userId,
          userEmail: userEmail,
          userName: userName,
          selectedOptionId: answers[q.id],
          correctOptionId: q.correctOptionId,
        }));

      // Bulk insert correct answers
      if (correctAnswerRecords.length > 0) {
        await db.insert(correctAnswers).values(correctAnswerRecords);
      }

      // Return results with correct answers
      const results = quizQuestions.map(q => ({
        questionId: q.id,
        questionText: q.questionText,
        correctOptionId: q.correctOptionId,
        userAnswer: answers[q.id],
        isCorrect: answers[q.id] === q.correctOptionId,
      }));

      return Response.json({
        success: true,
        attempt: newAttempt,
        results,
        correctAnswersCount: correctAnswerRecords.length,
      });
    }

    return Response.json({ error: 'Invalid request type' }, { status: 400 });
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 }
    );
  }
}