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
import { ArrowLeft, Calendar, Users, Trophy } from "lucide-react";
import type { Game } from "@/types/wingspan";

// Mock data - will be replaced with actual data fetching
function getMockGame(id: string): Game | null {
  const games: Record<string, Game> = {
    "1": {
      id: "1",
      playedAt: "2024-01-15",
      playerCount: 3,
      uploadedBy: "user1",
      createdAt: "2024-01-15",
      players: [
        {
          id: "p1",
          gameId: "1",
          playerName: "Alice",
          position: 1,
          scores: { birds: 45, bonus: 15, endOfRound: 10, eggs: 18, cachedFood: 4, tuckedCards: 8 },
          totalScore: 100,
          isWinner: true,
        },
        {
          id: "p2",
          gameId: "1",
          playerName: "Bob",
          position: 2,
          scores: { birds: 38, bonus: 12, endOfRound: 8, eggs: 14, cachedFood: 6, tuckedCards: 5 },
          totalScore: 83,
          isWinner: false,
        },
        {
          id: "p3",
          gameId: "1",
          playerName: "Charlie",
          position: 3,
          scores: { birds: 40, bonus: 10, endOfRound: 9, eggs: 12, cachedFood: 3, tuckedCards: 7 },
          totalScore: 81,
          isWinner: false,
        },
      ],
    },
    "2": {
      id: "2",
      playedAt: "2024-01-14",
      playerCount: 2,
      uploadedBy: "user1",
      createdAt: "2024-01-14",
      players: [
        {
          id: "p4",
          gameId: "2",
          playerName: "Alice",
          position: 1,
          scores: { birds: 52, bonus: 18, endOfRound: 12, eggs: 20, cachedFood: 8, tuckedCards: 10 },
          totalScore: 120,
          isWinner: true,
        },
        {
          id: "p5",
          gameId: "2",
          playerName: "Diana",
          position: 2,
          scores: { birds: 48, bonus: 14, endOfRound: 11, eggs: 16, cachedFood: 5, tuckedCards: 9 },
          totalScore: 103,
          isWinner: false,
        },
      ],
    },
  };

  return games[id] || null;
}

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params;
  const game = getMockGame(id);

  if (!game) {
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
            <p className="text-muted-foreground">Game not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const winner = game.players.find((p) => p.isWinner);
  const sortedPlayers = [...game.players].sort((a, b) => b.totalScore - a.totalScore);
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
          <h1 className="text-3xl font-bold tracking-tight">Game Details</h1>
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
        {winner && (
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">{winner.playerName}</span>
            <Badge variant="default">{winner.totalScore} pts</Badge>
          </div>
        )}
      </div>

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
                <TableHead className="text-right">End of Round</TableHead>
                <TableHead className="text-right">Eggs</TableHead>
                <TableHead className="text-right">Food</TableHead>
                <TableHead className="text-right">Tucked</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow key={player.id}>
                  <TableCell>
                    {index === 0 ? (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">1st</Badge>
                    ) : index === 1 ? (
                      <Badge variant="secondary">2nd</Badge>
                    ) : index === 2 ? (
                      <Badge variant="outline">3rd</Badge>
                    ) : (
                      <span className="text-muted-foreground">{index + 1}th</span>
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
                  <TableCell className="text-right font-bold">{player.totalScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedPlayers.map((player, index) => (
          <Card key={player.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{player.playerName}</CardTitle>
                {index === 0 ? (
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
    </div>
  );
}
