"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendData {
  game: number;
  score: number;
  date?: string;
}

interface ScoreTrendChartProps {
  data: TrendData[];
  title?: string;
  showAverage?: boolean;
}

export function ScoreTrendChart({
  data,
  title = "Score Trend",
  showAverage = true,
}: ScoreTrendChartProps) {
  const average =
    data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length)
      : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {showAverage && (
          <span className="text-sm text-muted-foreground">
            Avg: {average} pts
          </span>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="game"
              tickFormatter={(value) => `#${value}`}
              className="text-xs"
            />
            <YAxis domain={["auto", "auto"]} className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelFormatter={(value) => `Game #${value}`}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
