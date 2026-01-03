import { correctAnswers, users } from '@/db/schema';
import { db } from '@/db';
import { sql, eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientClerkId = url.searchParams.get('clerkId');

    console.log('=== GET /api/rankings - START ===');
    
    // Check if db is defined
    if (!db) {
      console.error('Database connection is undefined');
      return Response.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    console.log('Database connection OK');
    console.log('Fetching user rankings...');

    // Get all users with their correct answer counts
    const allUserRankings = await db
      .select({
        userId: correctAnswers.userId,
        userName: correctAnswers.userName,
        userEmail: correctAnswers.userEmail,
        totalCorrectAnswers: sql<number>`cast(count(*) as integer)`,
      })
      .from(correctAnswers)
      .groupBy(correctAnswers.userId, correctAnswers.userName, correctAnswers.userEmail)
      .orderBy(sql`count(*) DESC`);

    // Return ALL rankers instead of just top 6
    const topRankers = allUserRankings.map((user, index) => ({
      userId: user.userId,
      userName: user.userName || 'Anonymous',
      userEmail: user.userEmail,
      totalCorrectAnswers: user.totalCorrectAnswers,
      rank: index + 1,
    }));

    // If clerkId is provided, find the user's specific stats
    let userStats = null;
    if (clientClerkId) {
      // Find rank primarily by correct answers
      const rankIndex = allUserRankings.findIndex(r => r.userId === clientClerkId);
      const userRank = rankIndex !== -1 ? rankIndex + 1 : allUserRankings.length + 1;
      const userScore = rankIndex !== -1 ? allUserRankings[rankIndex].totalCorrectAnswers : 0;

      // Also get XP from users table
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clientClerkId))
        .limit(1);
      
      const xp = userData.length > 0 ? userData[0].xp : 0;

      userStats = {
        rank: userRank,
        points: userScore, // "Quiz Points" based on correct answers
        xp: xp || 0,
      };
    }

    return Response.json({
      topRankers,
      totalUsers: allUserRankings.length,
      userStats, 
    });

  } catch (error) {
    console.error('=== GET /api/rankings - ERROR ===');
    console.error('Error fetching rankings:', error);
    
    return Response.json(
      { 
        error: 'Failed to fetch rankings', 
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}