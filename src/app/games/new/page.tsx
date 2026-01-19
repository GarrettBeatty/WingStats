"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GameForm } from "@/components/game/game-form";
import { ImageUpload, ParsedScoreData } from "@/components/game/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function NewGamePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedScoreData | null>(null);
  const [activeTab, setActiveTab] = useState("manual");

  const handleSubmit = async (data: { playedAt: string; players: { name: string; birds: number; bonus: number; endOfRound: number; eggs: number; cachedFood: number; tuckedCards: number }[] }) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save game");
      }

      router.push("/games");
    } catch (error) {
      console.error("Failed to save game:", error);
      alert(error instanceof Error ? error.message : "Failed to save game");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParseComplete = (data: ParsedScoreData) => {
    setParsedData(data);
  };

  const handleConfirmParsed = async () => {
    if (!parsedData) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playedAt: new Date().toISOString().split("T")[0],
          players: parsedData.players.map((p) => ({
            name: p.name,
            birds: p.birds,
            bonus: p.bonus,
            endOfRound: p.endOfRound,
            eggs: p.eggs,
            cachedFood: p.cachedFood,
            tuckedCards: p.tuckedCards,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save game");
      }

      router.push("/games");
    } catch (error) {
      console.error("Failed to save game:", error);
      alert(error instanceof Error ? error.message : "Failed to save game");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditParsed = () => {
    // Switch to manual tab with parsed data pre-filled
    setActiveTab("manual");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Game</h1>
        <p className="text-muted-foreground">
          Record a new Wingspan game with scores for all players
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload">Upload Screenshot</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Enter Scores Manually</CardTitle>
              <CardDescription>
                Fill in the scores for each player. You can add up to 5 players.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GameForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Score Screenshot</CardTitle>
              <CardDescription>
                Upload a screenshot of the end-game score screen to automatically extract scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload onParseComplete={handleParseComplete} />

              {parsedData && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-4 font-medium">Parsed Scores - Please Review</h3>
                    <div className="space-y-3">
                      {parsedData.players.map((player, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between rounded-lg p-3 ${
                            parsedData.winners.includes(player.name)
                              ? "bg-primary/10 border border-primary/20"
                              : "bg-muted"
                          }`}
                        >
                          <div>
                            <span className="font-medium">{player.name}</span>
                            {parsedData.winners.includes(player.name) && (
                              <span className="ml-2 text-xs text-primary">Winner</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{player.total} pts</div>
                            <div className="text-xs text-muted-foreground">
                              Birds: {player.birds} | Bonus: {player.bonus} | Round: {player.endOfRound} | Eggs: {player.eggs} | Food: {player.cachedFood} | Tucked: {player.tuckedCards}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleConfirmParsed}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? "Saving..." : "Confirm & Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleEditParsed}
                      disabled={isSubmitting}
                    >
                      Edit Scores
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
