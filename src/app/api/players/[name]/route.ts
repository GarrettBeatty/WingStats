import { NextRequest, NextResponse } from "next/server";
import {
  calculatePlayerStatsAggregated,
  getGamesByPlayerAggregated,
} from "@/lib/dynamodb";
import { resolvePlayerIdentity } from "@/lib/playerMappings";

// GET /api/players/[name] - Get stats for a specific player (by Discord username or Wingspan name)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    // Resolve identity to handle both Discord usernames and Wingspan names
    const identity = resolvePlayerIdentity(decodedName);

    const stats = await calculatePlayerStatsAggregated(decodedName);

    if (!stats) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Get recent games (aggregated if registered)
    const games = await getGamesByPlayerAggregated(decodedName, 10);

    return NextResponse.json({
      stats,
      recentGames: games,
      identity: {
        isRegistered: identity.isRegistered,
        discordUsername: identity.discordUsername,
        wingspanNames: identity.wingspanNames,
      },
    });
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
