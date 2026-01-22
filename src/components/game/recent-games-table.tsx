"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Game } from "@/types/wingspan";

interface RecentGamesTableProps {
  games: Game[];
}

export function RecentGamesTable({ games }: RecentGamesTableProps) {
  if (games.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No games recorded yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Players</TableHead>
          <TableHead>Winner</TableHead>
          <TableHead className="text-right">Top Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((game) => {
          const winners = game.players.filter((p) => p.isWinner);
          const topScore = Math.max(...game.players.map((p) => p.totalScore));

          return (
            <TableRow key={game.id}>
              <TableCell>
                <Link
                  href={`/games/${game.id}`}
                  className="hover:underline"
                >
                  {new Date(game.playedAt).toLocaleDateString()}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {game.players.map((player) => (
                    <Badge key={player.id} variant="secondary">
                      {player.playerName}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {winners.length > 0 ? (
                  <span className="font-medium">
                    {winners.map((w) => w.playerName).join(", ")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">
                {topScore} pts
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
