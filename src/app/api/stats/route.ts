import { NextResponse } from "next/server";
import { getRecentGames, getLeaderboard } from "@/lib/dynamodb";

// GET /api/stats - Get dashboard statistics
export async function GET() {
  try {
    const [games, leaderboard] = await Promise.all([
      getRecentGames(100), // Get up to 100 games for stats
      getLeaderboard(),
    ]);

    // Calculate overall stats
    let totalScore = 0;
    let gameCount = 0;
    let highestScore = 0;
    let totalWins = 0;

    for (const game of games) {
      for (const player of game.players) {
        totalScore += player.totalScore;
        gameCount++;
        if (player.totalScore > highestScore) {
          highestScore = player.totalScore;
        }
        if (player.isWinner) {
          totalWins++;
        }
      }
    }

    const averageScore = gameCount > 0 ? totalScore / gameCount : 0;

    // Calculate category averages across all games
    const categoryTotals = {
      birds: 0,
      bonus: 0,
      endOfRound: 0,
      eggs: 0,
      cachedFood: 0,
      tuckedCards: 0,
    };

    for (const game of games) {
      for (const player of game.players) {
        categoryTotals.birds += player.scores.birds;
        categoryTotals.bonus += player.scores.bonus;
        categoryTotals.endOfRound += player.scores.endOfRound;
        categoryTotals.eggs += player.scores.eggs;
        categoryTotals.cachedFood += player.scores.cachedFood;
        categoryTotals.tuckedCards += player.scores.tuckedCards;
      }
    }

    const categoryAverages =
      gameCount > 0
        ? {
            birds: categoryTotals.birds / gameCount,
            bonus: categoryTotals.bonus / gameCount,
            endOfRound: categoryTotals.endOfRound / gameCount,
            eggs: categoryTotals.eggs / gameCount,
            cachedFood: categoryTotals.cachedFood / gameCount,
            tuckedCards: categoryTotals.tuckedCards / gameCount,
          }
        : categoryTotals;

    return NextResponse.json({
      totalGames: games.length,
      totalPlayers: leaderboard.length,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore,
      categoryAverages,
      recentGames: games.slice(0, 5),
      topPlayers: leaderboard.slice(0, 3),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
