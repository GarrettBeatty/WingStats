"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  RivalryNetwork,
  RivalryNetworkEdge,
} from "@/types/wingspan";

interface RivalryNetworkGraphProps {
  rivalryNetwork: RivalryNetwork;
}

const SVG_WIDTH = 760;
const SVG_HEIGHT = 420;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;
const X_RADIUS = 245;
const Y_RADIUS = 155;

function hashHue(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }

  return hash;
}

function truncateLabel(label: string): string {
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}

function formatMatchupSummary(
  edge: RivalryNetworkEdge,
  labels: Map<string, string>
): string {
  const sourceLabel = labels.get(edge.source) ?? edge.source;
  const targetLabel = labels.get(edge.target) ?? edge.target;
  const leaderLabel = edge.leaderId ? labels.get(edge.leaderId) ?? edge.leaderId : null;

  if (!leaderLabel) {
    return `${sourceLabel} and ${targetLabel} are even`;
  }

  return `${leaderLabel} leads ${Math.max(edge.sourceWins, edge.targetWins)}-${Math.min(
    edge.sourceWins,
    edge.targetWins
  )}`;
}

function getEdgeColor(
  edge: RivalryNetworkEdge,
  nodeHues: Map<string, number>
): string {
  if (!edge.leaderId) {
    return "hsl(var(--muted-foreground) / 0.35)";
  }

  const hue = nodeHues.get(edge.leaderId) ?? 210;
  const opacity = Math.min(
    0.8,
    0.3 + Math.abs(edge.sourceWins - edge.targetWins) / Math.max(edge.gamesTogether, 1)
  );

  return `hsl(${hue} 70% 50% / ${opacity})`;
}

export function RivalryNetworkGraph({
  rivalryNetwork,
}: RivalryNetworkGraphProps) {
  const nodes = rivalryNetwork.nodes;
  const edges = rivalryNetwork.edges;
  const labels = new Map(nodes.map((node) => [node.id, node.label]));
  const nodeHues = new Map(nodes.map((node) => [node.id, hashHue(node.id)]));
  const strongestEdges = [...edges]
    .sort(
      (left, right) =>
        right.gamesTogether - left.gamesTogether ||
        Math.abs(right.sourceWins - right.targetWins) -
          Math.abs(left.sourceWins - left.targetWins)
    )
    .slice(0, 5);

  if (nodes.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rivalry Network</CardTitle>
          <CardDescription>Track who shows up together and who usually gets the better score.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Add at least two players across recorded games to build the rivalry map.
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxGamesPlayed = Math.max(...nodes.map((node) => node.gamesPlayed), 1);
  const maxSharedGames = Math.max(...edges.map((edge) => edge.gamesTogether), 1);

  const positions = new Map<
    string,
    { x: number; y: number; radius: number; hue: number }
  >(
    nodes.map((node, index) => {
      const angle = -Math.PI / 2 + (index / nodes.length) * Math.PI * 2;
      const radius = 22 + (node.gamesPlayed / maxGamesPlayed) * 22;
      const hue = nodeHues.get(node.id) ?? 210;

      return [
        node.id,
        {
          x: CENTER_X + Math.cos(angle) * X_RADIUS,
          y: CENTER_Y + Math.sin(angle) * Y_RADIUS,
          radius,
          hue,
        },
      ];
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rivalry Network</CardTitle>
        <CardDescription>
          Node size tracks total games. Edge thickness tracks shared tables. Edge color leans toward the player who usually outscores the other.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Min {rivalryNetwork.minimumSharedGames} shared games</Badge>
          <Badge variant="outline">{nodes.length} players</Badge>
          <Badge variant="outline">{edges.length} rivalries</Badge>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="rounded-xl border bg-muted/20 p-2">
            {edges.length === 0 ? (
              <div className="flex h-[420px] items-center justify-center text-center text-sm text-muted-foreground">
                Not enough repeat matchups yet. Once players share at least{" "}
                {rivalryNetwork.minimumSharedGames} games, their rivalry lines will appear here.
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="h-auto w-full"
                role="img"
                aria-label="Player rivalry network"
              >
                <g>
                  {edges.map((edge) => {
                    const source = positions.get(edge.source);
                    const target = positions.get(edge.target);

                    if (!source || !target) {
                      return null;
                    }

                    return (
                      <line
                        key={edge.id}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={getEdgeColor(edge, nodeHues)}
                        strokeWidth={1.5 + (edge.gamesTogether / maxSharedGames) * 6}
                        strokeLinecap="round"
                      >
                         <title>
                           {(labels.get(edge.source) ?? edge.source)} vs{" "}
                           {(labels.get(edge.target) ?? edge.target)}: {edge.gamesTogether} shared
                           games, {edge.sourceWins}-{edge.targetWins}
                           {edge.ties > 0 ? ` with ${edge.ties} ties` : ""}, average margin{" "}
                           {edge.averageMargin.toFixed(1)}, averages{" "}
                           {edge.sourceAverageScore.toFixed(1)}-{edge.targetAverageScore.toFixed(1)}
                         </title>
                       </line>
                    );
                  })}
                </g>

                <g>
                  {nodes.map((node) => {
                    const position = positions.get(node.id);

                    if (!position) {
                      return null;
                    }

                    return (
                      <g key={node.id} transform={`translate(${position.x}, ${position.y})`}>
                        <title>
                          {node.label}: {node.gamesPlayed} games,{" "}
                          {(node.winRate * 100).toFixed(0)}% win rate, average{" "}
                          {node.averageScore.toFixed(1)}
                        </title>
                        <circle
                          r={position.radius}
                          fill={`hsl(${position.hue} 70% 50% / 0.16)`}
                          stroke={`hsl(${position.hue} 70% 45%)`}
                          strokeWidth="2"
                        />
                        <text
                          y="-4"
                          textAnchor="middle"
                          className="fill-foreground text-[12px] font-medium"
                        >
                          {truncateLabel(node.label)}
                        </text>
                        <text
                          y="12"
                          textAnchor="middle"
                          className="fill-muted-foreground text-[10px]"
                        >
                          {node.gamesPlayed} games
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}
          </div>

          <div className="space-y-3">
            {strongestEdges.length > 0 ? (
              strongestEdges.map((edge) => {
                const leaderHue = edge.leaderId
                  ? nodeHues.get(edge.leaderId) ?? 210
                  : null;
                const leaderLabel = edge.leaderId
                  ? labels.get(edge.leaderId) ?? edge.leaderId
                  : "Dead even";
                const sourceLabel = labels.get(edge.source) ?? edge.source;
                const targetLabel = labels.get(edge.target) ?? edge.target;

                return (
                  <div key={edge.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {sourceLabel} <span className="text-muted-foreground">vs</span>{" "}
                        {targetLabel}
                      </p>
                      <Badge
                        variant="secondary"
                        className="shrink-0"
                        style={
                          leaderHue === null
                            ? undefined
                            : {
                                backgroundColor: `hsl(${leaderHue} 70% 50% / 0.16)`,
                                color: `hsl(${leaderHue} 70% 30%)`,
                              }
                        }
                      >
                        {leaderLabel}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{formatMatchupSummary(edge, labels)}</p>
                      <p>
                        {edge.gamesTogether} shared games
                        {edge.ties > 0 ? ` · ${edge.ties} ties` : ""}
                      </p>
                      <p>
                        Avg score: {sourceLabel} {edge.sourceAverageScore.toFixed(1)} ·{" "}
                        {targetLabel} {edge.targetAverageScore.toFixed(1)}
                      </p>
                      <p>Average margin: {edge.averageMargin.toFixed(1)} points</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Repeat pairings will show up here once the same players face each other more often.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
