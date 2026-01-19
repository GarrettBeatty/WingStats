import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/dynamodb";

// GET /api/players - Get all players with stats (leaderboard)
export async function GET() {
  try {
    const leaderboard = await getLeaderboard();

    return NextResponse.json({ players: leaderboard });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
