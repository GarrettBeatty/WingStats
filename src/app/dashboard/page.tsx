"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import Link from "next/link";
import type { Game, ScoreBreakdown } from "@/types/wingspan";

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

interface StatsData {
  totalGames: number;
  totalPlayers: number;
  averageScore: number;
  highestScore: number;
  categoryAverages: ScoreBreakdown;
  recentGames: Game[];
  topPlayers: PlayerStats[];
}

const categoryChartConfig = {
  value: { label: "Points" },
  birds: { label: "Birds", color: "hsl(var(--chart-1))" },
  bonus: { label: "Bonus", color: "hsl(var(--chart-2))" },
  eggs: { label: "Eggs", color: "hsl(var(--chart-3))" },
  round: { label: "Round", color: "hsl(var(--chart-4))" },
  food: { label: "Food", color: "hsl(var(--chart-5))" },
  tucked: { label: "Tucked", color: "hsl(var(--primary))" },
  nectar: { label: "Nectar", color: "hsl(280, 70%, 50%)" },
  duet: { label: "Duet", color: "hsl(350, 60%, 65%)" },
} satisfies ChartConfig;

const trendChartConfig = {
  score: { label: "Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  const hasData = stats && stats.totalGames > 0;

  // Transform category averages into chart data
  const categoryData = stats ? [
    { category: "Birds", value: Math.round(stats.categoryAverages.birds * 10) / 10, fill: "var(--color-birds)" },
    { category: "Bonus", value: Math.round(stats.categoryAverages.bonus * 10) / 10, fill: "var(--color-bonus)" },
    { category: "Eggs", value: Math.round(stats.categoryAverages.eggs * 10) / 10, fill: "var(--color-eggs)" },
    { category: "Round", value: Math.round(stats.categoryAverages.endOfRound * 10) / 10, fill: "var(--color-round)" },
    { category: "Food", value: Math.round(stats.categoryAverages.cachedFood * 10) / 10, fill: "var(--color-food)" },
    { category: "Tucked", value: Math.round(stats.categoryAverages.tuckedCards * 10) / 10, fill: "var(--color-tucked)" },
    { category: "Nectar", value: Math.round((stats.categoryAverages.nectar || 0) * 10) / 10, fill: "var(--color-nectar)" },
    { category: "Duet", value: Math.round((stats.categoryAverages.duetTokens || 0) * 10) / 10, fill: "var(--color-duet)" },
  ] : [];

  // Transform recent games into trend data (reversed so oldest first)
  const trendData = stats?.recentGames
    .slice()
    .reverse()
    .map((game, index) => {
      const avgScore = game.players.reduce((sum, p) => sum + p.totalScore, 0) / game.players.length;
      return { game: String(index + 1), score: Math.round(avgScore) };
    }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {hasData ? "Wingspan game statistics at a glance" : "Upload your first game to see statistics"}
          </p>
        </div>
        <Link href="/games/new">
          <Badge className="cursor-pointer px-4 py-2 text-sm">+ Add Game</Badge>
        </Link>
      </div>

      {!hasData ? (
        <Card className="p-12 text-center">
          <CardContent>
            <p className="text-lg text-muted-foreground mb-4">No games recorded yet</p>
            <Link href="/games/new">
              <Badge className="cursor-pointer px-6 py-3 text-base">Upload Your First Score</Badge>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGames}</div>
                <p className="text-xs text-muted-foreground">{stats.totalPlayers} players</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageScore}</div>
                <p className="text-xs text-muted-foreground">Across all players</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPlayers}</div>
                <p className="text-xs text-muted-foreground">Unique players</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">High Score</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.highestScore}</div>
                <p className="text-xs text-muted-foreground">All-time best</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Score Trend */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Score Trend</CardTitle>
                <CardDescription>Average scores over recent games</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {trendData.length > 1 ? (
                  <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="game" tickFormatter={(v) => `#${v}`} className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="var(--color-score)"
                        strokeWidth={2}
                        dot={{ fill: "var(--color-score)", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Add more games to see trends
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Points by Category</CardTitle>
                <CardDescription>Average distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={categoryChartConfig} className="h-[300px] w-full">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <YAxis dataKey="category" type="category" width={50} className="text-xs" />
                    <XAxis type="number" className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Games */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Games</CardTitle>
                <CardDescription>Latest Wingspan sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentGames.slice(0, 4).map((game) => {
                    const winners = game.players.filter(p => p.isWinner);
                    const dateStr = new Date(game.playedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const winnerNames = winners.length > 0
                      ? winners.map(w => w.playerName).join(", ")
                      : "N/A";
                    return (
                      <Link
                        key={game.id}
                        href={`/games/${game.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                            {dateStr.split(" ")[1]}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {game.players.map(p => p.playerName).join(" vs ")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Winner{winners.length > 1 ? "s" : ""}: {winnerNames}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{winners[0]?.totalScore || 0} pts</p>
                          <p className="text-xs text-muted-foreground">{dateStr}</p>
                        </div>
                      </Link>
                    );
                  })}
                  {stats.recentGames.length > 4 && (
                    <Link
                      href="/games"
                      className="block text-center text-sm text-muted-foreground hover:text-foreground"
                    >
                      View all games →
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Players */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Players</CardTitle>
                <CardDescription>Leaderboard preview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topPlayers.length > 0 ? (
                    stats.topPlayers.map((player, index) => (
                      <div key={player.playerName} className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {index + 1}
                        </div>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{player.playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{player.playerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.gamesPlayed} games · {Math.round(player.winRate * 100)}% wins
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{Math.round(player.averageScore * 10) / 10}</p>
                          <p className="text-xs text-muted-foreground">avg</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No player stats yet
                    </p>
                  )}
                  {stats.topPlayers.length > 0 && (
                    <Link
                      href="/leaderboard"
                      className="block text-center text-sm text-muted-foreground hover:text-foreground"
                    >
                      View full leaderboard →
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
