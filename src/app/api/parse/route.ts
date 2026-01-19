import { NextRequest, NextResponse } from "next/server";

// ScoreBird service URL - set this to your deployed service
const SCOREBIRD_URL = process.env.SCOREBIRD_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Forward to ScoreBird service
    const response = await fetch(`${SCOREBIRD_URL}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: body.image }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `ScoreBird returned ${response.status}`);
    }

    const parsedData = await response.json();

    // Transform ScoreBird output to our format
    // ScoreBird returns: { players: [{name, scores: {bird_points, bonus, ...}, total}], winners: [] }
    const players = parsedData.players.map((player: {
      name: string;
      scores: {
        bird_points: number;
        bonus: number;
        cache: number;
        egg: number;
        end_of_round: number;
        tuck: number;
        nectar?: number;
      };
      total: number;
    }) => ({
      name: player.name,
      birds: player.scores.bird_points || 0,
      bonus: player.scores.bonus || 0,
      endOfRound: player.scores.end_of_round || 0,
      eggs: player.scores.egg || 0,
      cachedFood: player.scores.cache || 0,
      tuckedCards: player.scores.tuck || 0,
      nectar: player.scores.nectar || 0,
      total: player.total || 0,
    }));

    return NextResponse.json({
      players,
      winners: parsedData.winners || [],
      debugImage: parsedData.debug_image || null,
    });
  } catch (error) {
    console.error("Error parsing image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse image" },
      { status: 500 }
    );
  }
}
