"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Zap,
} from "lucide-react";
import type { Game } from "@/types/wingspan";

interface PlayerInsightsProps {
  allGames: Game[];
  playerNames: Set<string>;
  averageScore: number;
}

interface WinStreak {
  current: number;
  best: number;
}

interface RecentForm {
  last5Avg: number;
  last10Avg: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
}

interface CategoryBests {
  category: string;
  value: number;
  gameDate: string;
}

function calculateWinStreak(
  games: Game[],
  playerNames: Set<string>
): WinStreak {
  let current = 0;
  let best = 0;
  let counting = true;

  // Games are sorted newest first, so iterate in order
  for (const game of games) {
    const playerScore = game.players.find((p) =>
      playerNames.has(p.playerName.toLowerCase())
    );
    if (playerScore?.isWinner) {
      if (counting) current++;
      best = Math.max(best, counting ? current : 1);
    } else {
      if (counting) counting = false;
    }
  }

  // Recalculate best by looking at all streaks
  let streak = 0;
  for (const game of [...games].reverse()) {
    const playerScore = game.players.find((p) =>
      playerNames.has(p.playerName.toLowerCase())
    );
    if (playerScore?.isWinner) {
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }

  return { current, best };
}

function calculateRecentForm(
  games: Game[],
  playerNames: Set<string>,
  overallAverage: number
): RecentForm | null {
  if (games.length < 5) return null;

  const getScore = (game: Game) => {
    const playerScore = game.players.find((p) =>
      playerNames.has(p.playerName.toLowerCase())
    );
    return playerScore?.totalScore || 0;
  };

  const last5 = games.slice(0, 5);
  const last5Avg = last5.reduce((sum, g) => sum + getScore(g), 0) / 5;

  const last10 = games.slice(0, Math.min(10, games.length));
  const last10Avg =
    last10.reduce((sum, g) => sum + getScore(g), 0) / last10.length;

  const trendPercent = ((last5Avg - overallAverage) / overallAverage) * 100;

  let trend: "up" | "down" | "stable" = "stable";
  if (trendPercent > 3) trend = "up";
  else if (trendPercent < -3) trend = "down";

  return { last5Avg, last10Avg, trend, trendPercent };
}

function calculateCategoryBests(
  games: Game[],
  playerNames: Set<string>
): CategoryBests[] {
  const categories = [
    { key: "birds", label: "Birds" },
    { key: "bonus", label: "Bonus" },
    { key: "endOfRound", label: "Round Goals" },
    { key: "eggs", label: "Eggs" },
    { key: "cachedFood", label: "Cached Food" },
    { key: "tuckedCards", label: "Tucked Cards" },
    { key: "nectar", label: "Nectar" },
  ] as const;

  const bests: CategoryBests[] = [];

  for (const cat of categories) {
    let bestValue = 0;
    let bestDate = "";

    for (const game of games) {
      const playerScore = game.players.find((p) =>
        playerNames.has(p.playerName.toLowerCase())
      );
      if (playerScore) {
        const value = playerScore.scores[cat.key] || 0;
        if (value > bestValue) {
          bestValue = value;
          bestDate = game.playedAt;
        }
      }
    }

    if (bestValue > 0) {
      bests.push({
        category: cat.label,
        value: bestValue,
        gameDate: bestDate,
      });
    }
  }

  return bests.sort((a, b) => b.value - a.value).slice(0, 4);
}

function calculateMostPlayed(
  games: Game[],
  playerNames: Set<string>
): { name: string; games: number; winRate: number }[] {
  const opponents: Record<string, { games: number; wins: number }> = {};

  for (const game of games) {
    const playerScore = game.players.find((p) =>
      playerNames.has(p.playerName.toLowerCase())
    );
    if (!playerScore) continue;

    for (const opponent of game.players) {
      if (playerNames.has(opponent.playerName.toLowerCase())) continue;

      const name = opponent.playerName;
      if (!opponents[name]) {
        opponents[name] = { games: 0, wins: 0 };
      }
      opponents[name].games++;
      if (playerScore.isWinner) opponents[name].wins++;
    }
  }

  return Object.entries(opponents)
    .map(([name, data]) => ({
      name,
      games: data.games,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 3);
}

export function PlayerInsights({
  allGames,
  playerNames,
  averageScore,
}: PlayerInsightsProps) {
  const winStreak = calculateWinStreak(allGames, playerNames);
  const recentForm = calculateRecentForm(allGames, playerNames, averageScore);
  const categoryBests = calculateCategoryBests(allGames, playerNames);
  const mostPlayed = calculateMostPlayed(allGames, playerNames);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Win Streak Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Win Streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">{winStreak.current}</p>
              <p className="text-xs text-muted-foreground">Current streak</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-muted-foreground">
                {winStreak.best}
              </p>
              <p className="text-xs text-muted-foreground">Best streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Form Card */}
      {recentForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {recentForm.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : recentForm.trend === "down" ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Target className="h-4 w-4 text-blue-500" />
              )}
              Recent Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last 5 games</span>
                <span className="font-semibold">{recentForm.last5Avg.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last 10 games</span>
                <span className="font-semibold">{recentForm.last10Avg.toFixed(1)}</span>
              </div>
              <div className="pt-1">
                <Badge
                  variant={
                    recentForm.trend === "up"
                      ? "default"
                      : recentForm.trend === "down"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {recentForm.trend === "up" && "+"}
                  {recentForm.trendPercent.toFixed(1)}% vs overall
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Bests Card */}
      {categoryBests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Personal Bests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryBests.map((best) => (
                <div key={best.category} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {best.category}
                  </span>
                  <span className="font-semibold">{best.value} pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Played Opponents */}
      {mostPlayed.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              Frequent Opponents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {mostPlayed.map((opponent) => (
                <div
                  key={opponent.name}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{opponent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {opponent.games} games together
                    </p>
                  </div>
                  <Badge variant={opponent.winRate >= 50 ? "default" : "secondary"}>
                    {opponent.winRate.toFixed(0)}% WR
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
