import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/game/leaderboard-table";
import type { LeaderboardEntry } from "@/types/wingspan";

// Mock data - will be replaced with actual data fetching
const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: "user1",
    username: "Alice",
    avatarUrl: "",
    gamesPlayed: 15,
    winRate: 0.6,
    averageScore: 98.5,
  },
  {
    rank: 2,
    userId: "user2",
    username: "Bob",
    avatarUrl: "",
    gamesPlayed: 12,
    winRate: 0.5,
    averageScore: 92.3,
  },
  {
    rank: 3,
    userId: "user3",
    username: "Charlie",
    avatarUrl: "",
    gamesPlayed: 18,
    winRate: 0.44,
    averageScore: 89.7,
  },
  {
    rank: 4,
    userId: "user4",
    username: "Diana",
    avatarUrl: "",
    gamesPlayed: 8,
    winRate: 0.375,
    averageScore: 85.2,
  },
  {
    rank: 5,
    userId: "user5",
    username: "Eve",
    avatarUrl: "",
    gamesPlayed: 6,
    winRate: 0.333,
    averageScore: 82.1,
  },
];

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          Global rankings based on average score and win rate
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Players</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardTable entries={mockLeaderboard} />
        </CardContent>
      </Card>
    </div>
  );
}
