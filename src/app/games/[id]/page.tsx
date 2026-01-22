"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar, Users, Trophy, Pencil, Trash2 } from "lucide-react";
import type { Game } from "@/types/wingspan";
import { GameForm, type GameFormValues } from "@/components/game/game-form";
import { DeleteGameDialog } from "@/components/game/delete-game-dialog";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  async function fetchGame() {
    try {
      const response = await fetch(`/api/games/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Game not found");
        }
        throw new Error("Failed to fetch game");
      }
      const data = await response.json();
      setGame(data.game);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGame();
  }, [id]);

  async function handleUpdate(data: GameFormValues) {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update game");
      }
      const result = await response.json();
      setGame(result.game);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating game:", err);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete game");
      }
      router.push("/games");
    } catch (err) {
      console.error("Error deleting game:", err);
      setIsDeleting(false);
    }
  }

  function getInitialValues(): GameFormValues | undefined {
    if (!game) return undefined;
    return {
      playedAt: game.playedAt.split("T")[0],
      players: game.players
        .sort((a, b) => a.position - b.position)
        .map((p) => ({
          name: p.playerName,
          birds: p.scores.birds,
          bonus: p.scores.bonus,
          endOfRound: p.scores.endOfRound,
          eggs: p.scores.eggs,
          cachedFood: p.scores.cachedFood,
          tuckedCards: p.scores.tuckedCards,
          nectar: p.scores.nectar || 0,
          duetTokens: p.scores.duetTokens || 0,
        })),
    };
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/games">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Button>
        </Link>
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="space-y-6">
        <Link href="/games">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error || "Game not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const winners = game.players.filter((p) => p.isWinner);
  const sortedPlayers = [...game.players].sort((a, b) => b.totalScore - a.totalScore);

  // Calculate ranks with tie handling (competition ranking: 1, 1, 3)
  const playerRanks = new Map<string, number>();
  let prevScore: number | null = null;
  let rank = 0;
  sortedPlayers.forEach((player, index) => {
    if (player.totalScore !== prevScore) {
      rank = index + 1;
    }
    prevScore = player.totalScore;
    playerRanks.set(player.id, rank);
  });
  const formattedDate = new Date(game.playedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <Link href="/games">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Games
        </Button>
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Edit Game" : "Game Details"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {game.playerCount} players
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && winners.length > 0 && (
            <>
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">
                {winners.map((w) => w.playerName).join(", ")}
              </span>
              <Badge variant="default">{winners[0].totalScore} pts</Badge>
            </>
          )}
          {!isEditing && (
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
          {isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Game Details</CardTitle>
          </CardHeader>
          <CardContent>
            <GameForm
              onSubmit={handleUpdate}
              isSubmitting={isUpdating}
              initialValues={getInitialValues()}
              submitButtonText="Update Game"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Final Standings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Birds</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead className="text-right">Round</TableHead>
                    <TableHead className="text-right">Eggs</TableHead>
                    <TableHead className="text-right">Food</TableHead>
                    <TableHead className="text-right">Tucked</TableHead>
                    <TableHead className="text-right">Nectar</TableHead>
                    <TableHead className="text-right">Duet</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((player) => {
                  const playerRank = playerRanks.get(player.id) || 1;
                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        {playerRank === 1 ? (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600">1st</Badge>
                        ) : playerRank === 2 ? (
                          <Badge variant="secondary">2nd</Badge>
                        ) : playerRank === 3 ? (
                          <Badge variant="outline">3rd</Badge>
                        ) : (
                          <span className="text-muted-foreground">{playerRank}th</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {player.playerName}
                        {player.isWinner && (
                          <Trophy className="ml-2 inline h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">{player.scores.birds}</TableCell>
                      <TableCell className="text-right">{player.scores.bonus}</TableCell>
                      <TableCell className="text-right">{player.scores.endOfRound}</TableCell>
                      <TableCell className="text-right">{player.scores.eggs}</TableCell>
                      <TableCell className="text-right">{player.scores.cachedFood}</TableCell>
                      <TableCell className="text-right">{player.scores.tuckedCards}</TableCell>
                      <TableCell className="text-right">{player.scores.nectar || 0}</TableCell>
                      <TableCell className="text-right">{player.scores.duetTokens || 0}</TableCell>
                      <TableCell className="text-right font-bold">{player.totalScore}</TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedPlayers.map((player) => (
              <Card key={player.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{player.playerName}</CardTitle>
                    {player.isWinner ? (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">Winner</Badge>
                    ) : (
                      <Badge variant="outline">{player.totalScore} pts</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Birds</span>
                      <span className="font-medium">{player.scores.birds}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bonus Cards</span>
                      <span className="font-medium">{player.scores.bonus}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">End of Round</span>
                      <span className="font-medium">{player.scores.endOfRound}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Eggs</span>
                      <span className="font-medium">{player.scores.eggs}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cached Food</span>
                      <span className="font-medium">{player.scores.cachedFood}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tucked Cards</span>
                      <span className="font-medium">{player.scores.tuckedCards}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nectar</span>
                      <span className="font-medium">{player.scores.nectar || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duet Tokens</span>
                      <span className="font-medium">{player.scores.duetTokens || 0}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>{player.totalScore}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <DeleteGameDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
