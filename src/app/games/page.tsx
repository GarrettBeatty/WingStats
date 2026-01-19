import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentGamesTable } from "@/components/game/recent-games-table";
import type { Game } from "@/types/wingspan";

// Mock data - will be replaced with actual data fetching
const mockGames: Game[] = [
  {
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
  {
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
];

export default function GamesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Games</h1>
          <p className="text-muted-foreground">
            View and manage all recorded Wingspan games
          </p>
        </div>
        <Link href="/games/new">
          <Button>Add New Game</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Games</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentGamesTable games={mockGames} />
        </CardContent>
      </Card>
    </div>
  );
}
