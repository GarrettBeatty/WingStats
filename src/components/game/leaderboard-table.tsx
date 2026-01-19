"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  gamesPlayed: number;
  winRate: number;
  averageScore: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">1st</Badge>;
    case 2:
      return <Badge className="bg-gray-400 hover:bg-gray-500">2nd</Badge>;
    case 3:
      return <Badge className="bg-amber-600 hover:bg-amber-700">3rd</Badge>;
    default:
      return <Badge variant="outline">{rank}th</Badge>;
  }
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No players on the leaderboard yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Games</TableHead>
          <TableHead className="text-right">Win Rate</TableHead>
          <TableHead className="text-right">Avg Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.playerName}>
            <TableCell>{getRankBadge(entry.rank)}</TableCell>
            <TableCell>
              <Link
                href={`/players/${encodeURIComponent(entry.playerName)}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {entry.playerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{entry.playerName}</span>
              </Link>
            </TableCell>
            <TableCell className="text-right">{entry.gamesPlayed}</TableCell>
            <TableCell className="text-right">
              {(entry.winRate * 100).toFixed(1)}%
            </TableCell>
            <TableCell className="text-right font-mono">
              {entry.averageScore.toFixed(1)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
