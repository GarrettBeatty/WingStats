import { NextRequest, NextResponse } from "next/server";
import { createGame, getRecentGames } from "@/lib/dynamodb";

// GET /api/games - List recent games
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const games = await getRecentGames(limit);

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.playedAt || !body.players || body.players.length === 0) {
      return NextResponse.json(
        { error: "playedAt and players are required" },
        { status: 400 }
      );
    }

    // Validate players
    for (const player of body.players) {
      if (!player.name) {
        return NextResponse.json(
          { error: "Each player must have a name" },
          { status: 400 }
        );
      }
    }

    const game = await createGame({
      playedAt: body.playedAt,
      players: body.players,
      uploadedBy: body.uploadedBy,
      imageUrl: body.imageUrl,
    });

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}
