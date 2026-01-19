"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreBreakdown } from "@/types/wingspan";

interface CategoryBreakdownProps {
  data: ScoreBreakdown;
  title?: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(280, 70%, 50%)",
];

const CATEGORY_LABELS: Record<keyof ScoreBreakdown, string> = {
  birds: "Birds",
  bonus: "Bonus",
  endOfRound: "Round",
  eggs: "Eggs",
  cachedFood: "Food",
  tuckedCards: "Tucked",
  nectar: "Nectar",
};

export function CategoryBreakdown({
  data,
  title = "Points by Category",
}: CategoryBreakdownProps) {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  const chartData = Object.entries(data).map(([key, value], index) => ({
    category: CATEGORY_LABELS[key as keyof ScoreBreakdown],
    value,
    percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs" />
            <YAxis
              type="category"
              dataKey="category"
              width={60}
              className="text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value, _name, props) => {
                const payload = props.payload as { percentage: number };
                return [`${value} pts (${payload.percentage}%)`, "Score"];
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
