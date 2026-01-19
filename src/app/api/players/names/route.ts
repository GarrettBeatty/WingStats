import { NextResponse } from "next/server";
import { getAllWingspanNames, getAllDiscordUsers, getWingspanNames } from "@/lib/playerMappings";

// GET /api/players/names - Get all registered player names
export async function GET() {
  try {
    const wingspanNames = getAllWingspanNames();
    const discordUsers = getAllDiscordUsers();

    // Build a list of players with their discord username and wingspan names
    const players = discordUsers.map((discord) => ({
      discord,
      wingspanNames: getWingspanNames(discord),
    }));

    return NextResponse.json({
      wingspanNames,
      players,
    });
  } catch (error) {
    console.error("Error fetching player names:", error);
    return NextResponse.json(
      { error: "Failed to fetch player names" },
      { status: 500 }
    );
  }
}
