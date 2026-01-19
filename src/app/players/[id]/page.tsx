import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/statistics/stat-card";
import { CategoryRadarChart } from "@/components/statistics/category-chart";
import { ScoreTrendChart } from "@/components/statistics/score-trend-chart";
import { CategoryBreakdown } from "@/components/statistics/category-breakdown";
import type { PlayerStats, ScoreBreakdown } from "@/types/wingspan";

// Mock data - will be replaced with actual data fetching
function getMockPlayerStats(id: string): PlayerStats {
  const categoryAverages: ScoreBreakdown = {
    birds: 45,
    bonus: 14,
    endOfRound: 9,
    eggs: 16,
    cachedFood: 6,
    tuckedCards: 8,
  };

  return {
    userId: id,
    username: "Alice",
    avatarUrl: "",
    gamesPlayed: 15,
    totalWins: 9,
    winRate: 0.6,
    averageScore: 98.5,
    highScore: 142,
    lowScore: 67,
    standardDeviation: 18.3,
    categoryAverages,
    recentGames: [],
    scoreTrend: [85, 92, 78, 105, 98, 112, 89, 95, 102, 98],
  };
}

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;
  const stats = getMockPlayerStats(id);

  const trendData = stats.scoreTrend.map((score, index) => ({
    game: index + 1,
    score,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={stats.avatarUrl} alt={stats.username} />
          <AvatarFallback className="text-xl">
            {stats.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{stats.username}</h1>
          <div className="flex gap-2">
            <Badge>{stats.gamesPlayed} games</Badge>
            <Badge variant="secondary">
              {(stats.winRate * 100).toFixed(0)}% win rate
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Average Score"
          value={`${stats.averageScore.toFixed(1)}`}
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
          value={`±${stats.standardDeviation.toFixed(1)}`}
          description="Standard deviation"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreTrendChart data={trendData} title="Score History" />
        <CategoryRadarChart data={stats.categoryAverages} title="Scoring Profile" />
      </div>

      <CategoryBreakdown
        data={stats.categoryAverages}
        title="Average Points by Category"
      />
    </div>
  );
}
