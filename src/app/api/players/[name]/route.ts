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
    let decodedName = decodeURIComponent(name);

    // Strip @ prefix if present (common when users type @username)
    if (decodedName.startsWith("@")) {
      decodedName = decodedName.slice(1);
    }

    // Resolve identity to handle both Discord usernames and Wingspan names
    const identity = resolvePlayerIdentity(decodedName);

    const stats = await calculatePlayerStatsAggregated(decodedName);

    if (!stats) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Get all games for charts and history (aggregated if registered)
    const allGames = await getGamesByPlayerAggregated(decodedName);

    return NextResponse.json({
      stats,
      recentGames: allGames.slice(0, 10), // Keep recent games for backward compatibility
      allGames, // All games for charts
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
