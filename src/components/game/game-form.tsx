"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const playerScoreSchema = z.object({
  name: z.string().min(1, "Player name is required"),
  birds: z.number().min(0).max(200),
  bonus: z.number().min(0).max(100),
  endOfRound: z.number().min(0).max(50),
  eggs: z.number().min(0).max(100),
  cachedFood: z.number().min(0).max(50),
  tuckedCards: z.number().min(0).max(100),
});

const gameFormSchema = z.object({
  playedAt: z.string().min(1, "Date is required"),
  players: z.array(playerScoreSchema).min(1).max(5),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

interface GameFormProps {
  onSubmit: (data: GameFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const defaultPlayer = {
  name: "",
  birds: 0,
  bonus: 0,
  endOfRound: 0,
  eggs: 0,
  cachedFood: 0,
  tuckedCards: 0,
};

export function GameForm({ onSubmit, isSubmitting = false }: GameFormProps) {
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      playedAt: new Date().toISOString().split("T")[0],
      players: [{ ...defaultPlayer }, { ...defaultPlayer }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  const watchPlayers = form.watch("players");

  const calculateTotal = (index: number) => {
    const player = watchPlayers[index];
    if (!player) return 0;
    return (
      (player.birds || 0) +
      (player.bonus || 0) +
      (player.endOfRound || 0) +
      (player.eggs || 0) +
      (player.cachedFood || 0) +
      (player.tuckedCards || 0)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="playedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date Played</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Players</h3>
            {fields.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...defaultPlayer })}
              >
                Add Player
              </Button>
            )}
          </div>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Player {index + 1}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      Total: {calculateTotal(index)} pts
                    </span>
                  </CardTitle>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name={`players.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Player name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <FormField
                    control={form.control}
                    name={`players.${index}.birds`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birds</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`players.${index}.bonus`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bonus</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`players.${index}.endOfRound`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Round</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`players.${index}.eggs`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eggs</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`players.${index}.cachedFood`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Food</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`players.${index}.tuckedCards`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tucked</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Game"}
        </Button>
      </form>
    </Form>
  );
}
