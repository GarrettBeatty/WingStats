import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Mock data - will be replaced with actual data fetching
const mockPlayers = [
  {
    id: "user1",
    username: "Alice",
    avatarUrl: "",
    gamesPlayed: 15,
    winRate: 0.6,
    averageScore: 98.5,
  },
  {
    id: "user2",
    username: "Bob",
    avatarUrl: "",
    gamesPlayed: 12,
    winRate: 0.5,
    averageScore: 92.3,
  },
  {
    id: "user3",
    username: "Charlie",
    avatarUrl: "",
    gamesPlayed: 18,
    winRate: 0.44,
    averageScore: 89.7,
  },
  {
    id: "user4",
    username: "Diana",
    avatarUrl: "",
    gamesPlayed: 8,
    winRate: 0.375,
    averageScore: 85.2,
  },
];

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Players</h1>
        <p className="text-muted-foreground">
          View all players and their statistics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockPlayers.map((player) => (
          <Link key={player.id} href={`/players/${player.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={player.avatarUrl} alt={player.username} />
                  <AvatarFallback>
                    {player.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{player.username}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {player.gamesPlayed} games played
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {(player.winRate * 100).toFixed(0)}% win rate
                  </Badge>
                  <Badge variant="outline">
                    {player.averageScore.toFixed(1)} avg
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
