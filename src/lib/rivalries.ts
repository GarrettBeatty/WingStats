import { resolvePlayerIdentity } from "@/lib/playerMappings";
import type { Game, RivalryNetwork } from "@/types/wingspan";

const MIN_SHARED_GAMES = 2;

interface CanonicalParticipant {
  id: string;
  label: string;
  totalScore: number;
  isWinner: boolean;
}

interface NodeAccumulator {
  id: string;
  label: string;
  gamesPlayed: number;
  totalWins: number;
  totalScore: number;
}

interface EdgeAccumulator {
  id: string;
  source: string;
  target: string;
  gamesTogether: number;
  sourceWins: number;
  targetWins: number;
  ties: number;
  totalMargin: number;
  sourceTotalScore: number;
  targetTotalScore: number;
}

function toCanonicalParticipant(
  player: Game["players"][number]
): CanonicalParticipant {
  const identity = resolvePlayerIdentity(player.playerName);
  const canonicalId =
    identity.discordUsername ?? player.playerName.toLowerCase();
  const label = identity.discordUsername ?? player.playerName;

  return {
    id: canonicalId,
    label,
    totalScore: player.totalScore,
    isWinner: player.isWinner,
  };
}

export function buildRivalryNetwork(games: Game[]): RivalryNetwork {
  const nodes = new Map<string, NodeAccumulator>();
  const edges = new Map<string, EdgeAccumulator>();

  for (const game of games) {
    const participantsById = new Map<string, CanonicalParticipant>();

    for (const player of game.players) {
      const canonicalPlayer = toCanonicalParticipant(player);
      const existingInGame = participantsById.get(canonicalPlayer.id);

      if (!existingInGame || canonicalPlayer.totalScore > existingInGame.totalScore) {
        participantsById.set(canonicalPlayer.id, canonicalPlayer);
      }
    }

    const participants = Array.from(participantsById.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    for (const participant of participants) {
      const existingNode = nodes.get(participant.id);
      if (existingNode) {
        existingNode.label = existingNode.label || participant.label;
        existingNode.gamesPlayed += 1;
        existingNode.totalWins += participant.isWinner ? 1 : 0;
        existingNode.totalScore += participant.totalScore;
      } else {
        nodes.set(participant.id, {
          id: participant.id,
          label: participant.label,
          gamesPlayed: 1,
          totalWins: participant.isWinner ? 1 : 0,
          totalScore: participant.totalScore,
        });
      }
    }

    for (let sourceIndex = 0; sourceIndex < participants.length; sourceIndex += 1) {
      for (
        let targetIndex = sourceIndex + 1;
        targetIndex < participants.length;
        targetIndex += 1
      ) {
        const source = participants[sourceIndex];
        const target = participants[targetIndex];
        const edgeId = `${source.id}::${target.id}`;
        const edge = edges.get(edgeId) ?? {
          id: edgeId,
          source: source.id,
          target: target.id,
          gamesTogether: 0,
          sourceWins: 0,
          targetWins: 0,
          ties: 0,
          totalMargin: 0,
          sourceTotalScore: 0,
          targetTotalScore: 0,
        };

        edge.gamesTogether += 1;
        edge.sourceTotalScore += source.totalScore;
        edge.targetTotalScore += target.totalScore;

        if (source.totalScore > target.totalScore) {
          edge.sourceWins += 1;
        } else if (target.totalScore > source.totalScore) {
          edge.targetWins += 1;
        } else {
          edge.ties += 1;
        }

        edge.totalMargin += Math.abs(source.totalScore - target.totalScore);
        edges.set(edgeId, edge);
      }
    }
  }

  return {
    nodes: Array.from(nodes.values())
      .map((node) => ({
        id: node.id,
        label: node.label,
        gamesPlayed: node.gamesPlayed,
        totalWins: node.totalWins,
        winRate: node.gamesPlayed > 0 ? node.totalWins / node.gamesPlayed : 0,
        averageScore: node.gamesPlayed > 0 ? node.totalScore / node.gamesPlayed : 0,
      }))
      .sort(
        (left, right) =>
          right.gamesPlayed - left.gamesPlayed ||
          right.winRate - left.winRate ||
          left.label.localeCompare(right.label)
      ),
    edges: Array.from(edges.values())
      .filter((edge) => edge.gamesTogether >= MIN_SHARED_GAMES)
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        gamesTogether: edge.gamesTogether,
        sourceWins: edge.sourceWins,
        targetWins: edge.targetWins,
        ties: edge.ties,
        averageMargin: edge.totalMargin / edge.gamesTogether,
        sourceAverageScore: edge.sourceTotalScore / edge.gamesTogether,
        targetAverageScore: edge.targetTotalScore / edge.gamesTogether,
        leaderId:
          edge.sourceWins === edge.targetWins
            ? null
            : edge.sourceWins > edge.targetWins
              ? edge.source
              : edge.target,
      }))
      .sort(
        (left, right) =>
          right.gamesTogether - left.gamesTogether ||
          Math.abs(right.sourceWins - right.targetWins) -
            Math.abs(left.sourceWins - left.targetWins)
      ),
    minimumSharedGames: MIN_SHARED_GAMES,
  };
}
