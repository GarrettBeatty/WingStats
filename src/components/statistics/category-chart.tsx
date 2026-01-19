"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreBreakdown } from "@/types/wingspan";

interface CategoryChartProps {
  data: ScoreBreakdown;
  title?: string;
  color?: string;
}

export function CategoryRadarChart({
  data,
  title = "Score Breakdown",
  color = "hsl(var(--chart-1))",
}: CategoryChartProps) {
  const chartData = [
    { category: "Birds", value: data.birds, fullMark: 100 },
    { category: "Bonus", value: data.bonus, fullMark: 30 },
    { category: "Round", value: data.endOfRound, fullMark: 25 },
    { category: "Eggs", value: data.eggs, fullMark: 30 },
    { category: "Food", value: data.cachedFood, fullMark: 20 },
    { category: "Tucked", value: data.tuckedCards, fullMark: 30 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis angle={30} domain={[0, "auto"]} />
            <Radar
              name="Score"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.5}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
