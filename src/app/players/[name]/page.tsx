"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/statistics/stat-card";
import { CategoryRadarChart } from "@/components/statistics/category-chart";
import { ScoreTrendChart } from "@/components/statistics/score-trend-chart";
import { CategoryBreakdown } from "@/components/statistics/category-breakdown";
import type { Game, ScoreBreakdown } from "@/types/wingspan";

interface PlayerStats {
  playerName: string;
  discordUsername?: string;
  aliases?: string[];
  gamesPlayed: number;
  totalWins: number;
  winRate: number;
  averageScore: number;
  highScore: number;
  lowScore: number;
  categoryAverages: ScoreBreakdown;
}

interface PlayerIdentity {
  isRegistered: boolean;
  discordUsername: string | null;
  wingspanNames: string[];
}

interface PlayerData {
  stats: PlayerStats;
  recentGames: Game[];
  identity?: PlayerIdentity;
}

export default function PlayerPage() {
  const params = useParams();
  const name = params.name as string;
  const decodedName = decodeURIComponent(name);

  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayerData() {
      try {
        const response = await fetch(`/api/players/${encodeURIComponent(decodedName)}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Player not found");
          }
          throw new Error("Failed to fetch player data");
        }
        const playerData = await response.json();
        setData(playerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load player");
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [decodedName]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loading player...</h1>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Player</h1>
          <p className="text-red-500">{error || "Player not found"}</p>
        </div>
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-muted-foreground mb-4">Could not find player "{decodedName}"</p>
            <Link href="/players">
              <Badge className="cursor-pointer px-4 py-2">Back to Players</Badge>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, recentGames, identity } = data;

  // Get all names to search for (aliases if registered, otherwise just the player name)
  const playerNames = identity?.wingspanNames.length
    ? new Set(identity.wingspanNames.map((n) => n.toLowerCase()))
    : new Set([stats.playerName.toLowerCase()]);

  // Helper to find player score in a game (handles aliases)
  const findPlayerScore = (game: Game) => {
    return game.players.find((p) => playerNames.has(p.playerName.toLowerCase()));
  };

  // Build trend data from recent games
  const trendData = recentGames
    .slice()
    .reverse()
    .map((game, index) => {
      const playerScore = findPlayerScore(game);
      return {
        game: index + 1,
        score: playerScore?.totalScore || 0,
      };
    });

  // Calculate standard deviation
  const scores = recentGames.map((game) => {
    const playerScore = findPlayerScore(game);
    return playerScore?.totalScore || 0;
  });
  const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const variance =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
      : 0;
  const stdDev = Math.sqrt(variance);

  // Display name and aliases
  const displayName = identity?.discordUsername || stats.playerName;
  const aliases = identity?.isRegistered ? identity.wingspanNames : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
          {aliases && aliases.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Also known as: {aliases.join(", ")}
            </p>
          )}
          <div className="flex gap-2 mt-1">
            <Badge>{stats.gamesPlayed} games</Badge>
            <Badge variant="secondary">
              {Math.round(stats.winRate * 100)}% win rate
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Average Score"
          value={`${Math.round(stats.averageScore * 10) / 10}`}
          description="Points per game"
        />
        <StatCard
          title="High Score"
          value={stats.highScore}
          description="Personal best"
        />
        <StatCard
          title="Low Score"
          value={stats.lowScore}
          description="Room for improvement"
        />
        <StatCard
          title="Consistency"
          value={`±${Math.round(stdDev * 10) / 10}`}
          description="Standard deviation"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {trendData.length > 1 ? (
          <ScoreTrendChart data={trendData} title="Score History" />
        ) : (
          <Card className="p-8">
            <CardContent className="text-center text-muted-foreground">
              Play more games to see score trends
            </CardContent>
          </Card>
        )}
        <CategoryRadarChart data={stats.categoryAverages} title="Scoring Profile" />
      </div>

      <CategoryBreakdown
        data={stats.categoryAverages}
        title="Average Points by Category"
      />
    </div>
  );
}
