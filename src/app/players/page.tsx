"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await fetch("/api/players");
        if (!response.ok) throw new Error("Failed to fetch players");
        const data = await response.json();
        setPlayers(data.players);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load players");
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground">Loading players...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Players</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Players</h1>
        <p className="text-muted-foreground">
          {players.length > 0
            ? "View all players and their statistics"
            : "No players yet. Upload a game to get started!"}
        </p>
      </div>

      {players.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <p className="text-lg text-muted-foreground mb-4">No players recorded yet</p>
            <Link href="/games/new">
              <Badge className="cursor-pointer px-6 py-3 text-base">Upload Your First Score</Badge>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <Link key={player.playerName} href={`/players/${encodeURIComponent(player.playerName)}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {player.playerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{player.playerName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {player.gamesPlayed} games played
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {Math.round(player.winRate * 100)}% win rate
                    </Badge>
                    <Badge variant="outline">
                      {Math.round(player.averageScore * 10) / 10} avg
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
