"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeaderboardTable } from "@/components/game/leaderboard-table";
import type { ScoreBreakdown } from "@/types/wingspan";

interface PlayerStats {
  playerName: string;
  gamesPlayed: number;
  totalWins: number;
  winRate: number;
  averageScore: number;
  highScore: number;
  lowScore: number;
  categoryAverages: ScoreBreakdown;
}

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  gamesPlayed: number;
  winRate: number;
  averageScore: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch("/api/players");
        if (!response.ok) throw new Error("Failed to fetch leaderboard");
        const data = await response.json();

        // Transform PlayerStats to LeaderboardEntry with rank
        const leaderboard: LeaderboardEntry[] = data.players.map(
          (player: PlayerStats, index: number) => ({
            rank: index + 1,
            playerName: player.playerName,
            gamesPlayed: player.gamesPlayed,
            winRate: player.winRate,
            averageScore: player.averageScore,
          })
        );

        setEntries(leaderboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          {entries.length > 0
            ? "Global rankings based on average score"
            : "No players yet. Upload a game to get started!"}
        </p>
      </div>

      {entries.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <p className="text-lg text-muted-foreground mb-4">No players on the leaderboard yet</p>
            <Link href="/games/new">
              <Badge className="cursor-pointer px-6 py-3 text-base">Upload Your First Score</Badge>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Top Players</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardTable entries={entries} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
