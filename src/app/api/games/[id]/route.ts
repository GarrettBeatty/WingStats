import { NextRequest, NextResponse } from "next/server";
import { getGame, updateGame, deleteGame } from "@/lib/dynamodb";
import { z } from "zod";

const playerScoreSchema = z.object({
  name: z.string().min(1),
  birds: z.number().min(0).max(200),
  bonus: z.number().min(0).max(100),
  endOfRound: z.number().min(0).max(50),
  eggs: z.number().min(0).max(100),
  cachedFood: z.number().min(0).max(50),
  tuckedCards: z.number().min(0).max(100),
  nectar: z.number().min(0).max(100),
});

const updateGameSchema = z.object({
  playedAt: z.string().min(1),
  players: z.array(playerScoreSchema).min(1).max(5),
});

// GET /api/games/[id] - Get a specific game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = await getGame(id);

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}

// PUT /api/games/[id] - Update a specific game
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validationResult = updateGameSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const game = await updateGame(id, validationResult.data);

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Error updating game:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[id] - Delete a specific game
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteGame(id);

    if (!success) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting game:", error);
    return NextResponse.json(
      { error: "Failed to delete game" },
      { status: 500 }
    );
  }
}
