"use client";

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
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import Link from "next/link";

// Mock data
const recentGames = [
  { id: "1", date: "Jan 15", winner: "Alice", score: 100, players: ["Alice", "Bob", "Charlie"] },
  { id: "2", date: "Jan 14", winner: "Diana", score: 112, players: ["Alice", "Diana"] },
  { id: "3", date: "Jan 12", winner: "Bob", score: 95, players: ["Bob", "Eve", "Frank"] },
  { id: "4", date: "Jan 10", winner: "Alice", score: 108, players: ["Alice", "Charlie"] },
];

const categoryData = [
  { category: "Birds", value: 42, fill: "var(--color-birds)" },
  { category: "Bonus", value: 14, fill: "var(--color-bonus)" },
  { category: "Eggs", value: 16, fill: "var(--color-eggs)" },
  { category: "Round", value: 9, fill: "var(--color-round)" },
  { category: "Food", value: 6, fill: "var(--color-food)" },
  { category: "Tucked", value: 8, fill: "var(--color-tucked)" },
];

const trendData = [
  { game: "1", score: 85 },
  { game: "2", score: 92 },
  { game: "3", score: 78 },
  { game: "4", score: 105 },
  { game: "5", score: 98 },
  { game: "6", score: 112 },
  { game: "7", score: 89 },
  { game: "8", score: 95 },
];

const topPlayers = [
  { name: "Alice", games: 15, winRate: 60, avg: 98.5 },
  { name: "Bob", games: 12, winRate: 50, avg: 92.3 },
  { name: "Charlie", games: 18, winRate: 44, avg: 89.7 },
];

const categoryChartConfig = {
  value: { label: "Points" },
  birds: { label: "Birds", color: "hsl(var(--chart-1))" },
  bonus: { label: "Bonus", color: "hsl(var(--chart-2))" },
  eggs: { label: "Eggs", color: "hsl(var(--chart-3))" },
  round: { label: "Round", color: "hsl(var(--chart-4))" },
  food: { label: "Food", color: "hsl(var(--chart-5))" },
  tucked: { label: "Tucked", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const trendChartConfig = {
  score: { label: "Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your Wingspan game statistics at a glance
          </p>
        </div>
        <Link href="/games/new">
          <Badge className="cursor-pointer px-4 py-2 text-sm">+ Add Game</Badge>
        </Link>
      </div>

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
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+3 from last week</p>
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
            <div className="text-2xl font-bold">87.5</div>
            <p className="text-xs text-muted-foreground">+2.3 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42%</div>
            <p className="text-xs text-muted-foreground">10 wins / 24 games</p>
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
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">Personal best</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Score Trend */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
            <CardDescription>Your scores over recent games</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
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
            <CardDescription>Your latest Wingspan sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {game.date.split(" ")[1]}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {game.players.join(" vs ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Winner: {game.winner}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{game.score} pts</p>
                    <p className="text-xs text-muted-foreground">{game.date}</p>
                  </div>
                </Link>
              ))}
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
              {topPlayers.map((player, index) => (
                <div key={player.name} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.games} games · {player.winRate}% wins
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{player.avg}</p>
                    <p className="text-xs text-muted-foreground">avg</p>
                  </div>
                </div>
              ))}
              <Link
                href="/leaderboard"
                className="block text-center text-sm text-muted-foreground hover:text-foreground"
              >
                View full leaderboard →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
