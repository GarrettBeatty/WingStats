"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RollingAverageData {
  game: number;
  average: number;
  score: number;
  date?: string;
}

interface RollingAverageChartProps {
  data: RollingAverageData[];
  title?: string;
  currentAverage?: number;
}

export function RollingAverageChart({
  data,
  title = "Average Over Time",
  currentAverage,
}: RollingAverageChartProps) {
  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          Play more games to see average progression
        </CardContent>
      </Card>
    );
  }

  const minAvg = Math.min(...data.map((d) => d.average));
  const maxAvg = Math.max(...data.map((d) => d.average));
  const padding = (maxAvg - minAvg) * 0.1 || 5;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {currentAverage !== undefined && (
          <span className="text-sm text-muted-foreground">
            Current: {currentAverage.toFixed(1)} pts
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
            <YAxis
              domain={[Math.floor(minAvg - padding), Math.ceil(maxAvg + padding)]}
              className="text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelFormatter={(value) => `After Game #${value}`}
              formatter={(value: number, name: string) => [
                value.toFixed(1),
                name === "average" ? "Running Avg" : "Game Score",
              ]}
            />
            {currentAverage !== undefined && (
              <ReferenceLine
                y={currentAverage}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            )}
            <Line
              type="monotone"
              dataKey="average"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "hsl(var(--chart-2))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
