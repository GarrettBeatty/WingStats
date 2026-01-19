"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentGamesTable } from "@/components/game/recent-games-table";
import type { Game } from "@/types/wingspan";

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        const response = await fetch("/api/games?limit=50");
        if (!response.ok) throw new Error("Failed to fetch games");
        const data = await response.json();
        setGames(data.games);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load games");
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Games</h1>
          <p className="text-muted-foreground">
            View and manage all recorded Wingspan games
          </p>
        </div>
        <Link href="/games/new">
          <Button>Add New Game</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Games</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Loading games...
            </div>
          ) : error ? (
            <div className="flex h-32 items-center justify-center text-red-500">
              {error}
            </div>
          ) : (
            <RecentGamesTable games={games} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
