import { NextRequest, NextResponse } from "next/server";
import { calculatePlayerStats, getGamesByPlayer } from "@/lib/dynamodb";

// GET /api/players/[name] - Get stats for a specific player
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const stats = await calculatePlayerStats(decodedName);

    if (!stats) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Also get recent games for this player
    const games = await getGamesByPlayer(decodedName, 10);

    return NextResponse.json({
      stats,
      recentGames: games,
    });
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
