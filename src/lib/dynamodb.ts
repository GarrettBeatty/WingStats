import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import type { Game, PlayerScore, ScoreBreakdown } from "@/types/wingspan";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const docClient = DynamoDBDocumentClient.from(client);

// Table names from CDK
const GAMES_TABLE = process.env.GAMES_TABLE || "wingstats-games";
const USERS_TABLE = process.env.USERS_TABLE || "wingstats-users";

// ============================================
// Games Operations
// ============================================

interface CreateGameInput {
  playedAt: string;
  players: {
    name: string;
    birds: number;
    bonus: number;
    endOfRound: number;
    eggs: number;
    cachedFood: number;
    tuckedCards: number;
    nectar: number;
  }[];
  uploadedBy?: string;
  imageUrl?: string;
}

export async function createGame(input: CreateGameInput): Promise<Game> {
  const gameId = uuidv4();
  const createdAt = new Date().toISOString();

  // Calculate totals and determine winner
  const playersWithScores = input.players.map((player, index) => {
    const scores: ScoreBreakdown = {
      birds: player.birds,
      bonus: player.bonus,
      endOfRound: player.endOfRound,
      eggs: player.eggs,
      cachedFood: player.cachedFood,
      tuckedCards: player.tuckedCards,
      nectar: player.nectar,
    };
    const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
    return {
      ...player,
      scores,
      totalScore,
      position: index + 1,
    };
  });

  const maxScore = Math.max(...playersWithScores.map((p) => p.totalScore));
  const winners = playersWithScores.filter((p) => p.totalScore === maxScore);

  // Store game metadata
  await docClient.send(
    new PutCommand({
      TableName: GAMES_TABLE,
      Item: {
        PK: `GAME#${gameId}`,
        SK: "METADATA",
        GSI1PK: "GAMES", // For querying all games by date
        gameId,
        playedAt: input.playedAt,
        playerCount: input.players.length,
        uploadedBy: input.uploadedBy || "anonymous",
        imageUrl: input.imageUrl,
        createdAt,
        winningScore: maxScore,
      },
    })
  );

  // Store each player's scores
  const playerScores: PlayerScore[] = [];
  for (const player of playersWithScores) {
    const playerId = uuidv4();
    const isWinner = player.totalScore === maxScore;

    await docClient.send(
      new PutCommand({
        TableName: GAMES_TABLE,
        Item: {
          PK: `GAME#${gameId}`,
          SK: `PLAYER#${player.position}`,
          playerId,
          gameId,
          playerName: player.name,
          position: player.position,
          scores: player.scores,
          totalScore: player.totalScore,
          isWinner,
          playedAt: input.playedAt, // For GSI2-ByPlayer
        },
      })
    );

    playerScores.push({
      id: playerId,
      gameId,
      playerName: player.name,
      position: player.position,
      scores: player.scores,
      totalScore: player.totalScore,
      isWinner,
    });
  }

  return {
    id: gameId,
    playedAt: input.playedAt,
    playerCount: input.players.length,
    uploadedBy: input.uploadedBy || "anonymous",
    imageUrl: input.imageUrl,
    createdAt,
    players: playerScores,
  };
}

export async function getGame(gameId: string): Promise<Game | null> {
  // Get game metadata
  const metadataResult = await docClient.send(
    new GetCommand({
      TableName: GAMES_TABLE,
      Key: {
        PK: `GAME#${gameId}`,
        SK: "METADATA",
      },
    })
  );

  if (!metadataResult.Item) {
    return null;
  }

  // Get all player scores for this game
  const playersResult = await docClient.send(
    new QueryCommand({
      TableName: GAMES_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `GAME#${gameId}`,
        ":sk": "PLAYER#",
      },
    })
  );

  const players: PlayerScore[] = (playersResult.Items || []).map((item) => ({
    id: item.playerId,
    gameId: item.gameId,
    playerName: item.playerName,
    position: item.position,
    scores: item.scores,
    totalScore: item.totalScore,
    isWinner: item.isWinner,
  }));

  return {
    id: metadataResult.Item.gameId,
    playedAt: metadataResult.Item.playedAt,
    playerCount: metadataResult.Item.playerCount,
    uploadedBy: metadataResult.Item.uploadedBy,
    imageUrl: metadataResult.Item.imageUrl,
    createdAt: metadataResult.Item.createdAt,
    players,
  };
}

export async function getRecentGames(limit: number = 10): Promise<Game[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: GAMES_TABLE,
      IndexName: "GSI1-ByDate",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "GAMES",
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
    })
  );

  // Fetch full game data for each game
  const games: Game[] = [];
  for (const item of result.Items || []) {
    const game = await getGame(item.gameId);
    if (game) {
      games.push(game);
    }
  }

  return games;
}

export async function getGamesByPlayer(
  playerName: string,
  limit: number = 50
): Promise<Game[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: GAMES_TABLE,
      IndexName: "GSI2-ByPlayer",
      KeyConditionExpression: "playerName = :name",
      ExpressionAttributeValues: {
        ":name": playerName,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  // Get unique game IDs and fetch full game data
  const gameIds = [...new Set((result.Items || []).map((item) => item.gameId))];
  const games: Game[] = [];
  for (const gameId of gameIds) {
    const game = await getGame(gameId);
    if (game) {
      games.push(game);
    }
  }

  return games;
}

// ============================================
// Player Stats Operations
// ============================================

export interface PlayerStats {
  playerName: string;
  gamesPlayed: number;
  totalWins: number;
  winRate: number;
  averageScore: number;
  highScore: number;
  lowScore: number;
  categoryAverages: ScoreBreakdown;
}

export async function calculatePlayerStats(
  playerName: string
): Promise<PlayerStats | null> {
  const games = await getGamesByPlayer(playerName);

  if (games.length === 0) {
    return null;
  }

  let totalScore = 0;
  let totalWins = 0;
  let highScore = 0;
  let lowScore = Infinity;
  const categoryTotals: ScoreBreakdown = {
    birds: 0,
    bonus: 0,
    endOfRound: 0,
    eggs: 0,
    cachedFood: 0,
    tuckedCards: 0,
    nectar: 0,
  };

  for (const game of games) {
    const playerScore = game.players.find((p) => p.playerName === playerName);
    if (playerScore) {
      totalScore += playerScore.totalScore;
      if (playerScore.isWinner) totalWins++;
      if (playerScore.totalScore > highScore) highScore = playerScore.totalScore;
      if (playerScore.totalScore < lowScore) lowScore = playerScore.totalScore;

      categoryTotals.birds += playerScore.scores.birds;
      categoryTotals.bonus += playerScore.scores.bonus;
      categoryTotals.endOfRound += playerScore.scores.endOfRound;
      categoryTotals.eggs += playerScore.scores.eggs;
      categoryTotals.cachedFood += playerScore.scores.cachedFood;
      categoryTotals.tuckedCards += playerScore.scores.tuckedCards;
      categoryTotals.nectar += playerScore.scores.nectar || 0;
    }
  }

  const gamesPlayed = games.length;

  return {
    playerName,
    gamesPlayed,
    totalWins,
    winRate: totalWins / gamesPlayed,
    averageScore: totalScore / gamesPlayed,
    highScore,
    lowScore: lowScore === Infinity ? 0 : lowScore,
    categoryAverages: {
      birds: categoryTotals.birds / gamesPlayed,
      bonus: categoryTotals.bonus / gamesPlayed,
      endOfRound: categoryTotals.endOfRound / gamesPlayed,
      eggs: categoryTotals.eggs / gamesPlayed,
      cachedFood: categoryTotals.cachedFood / gamesPlayed,
      tuckedCards: categoryTotals.tuckedCards / gamesPlayed,
      nectar: categoryTotals.nectar / gamesPlayed,
    },
  };
}

// ============================================
// Leaderboard Operations
// ============================================

export async function getAllPlayerNames(): Promise<string[]> {
  // This is a simplified approach - in production you'd want to maintain
  // a separate list of players or use a different access pattern
  const result = await docClient.send(
    new QueryCommand({
      TableName: GAMES_TABLE,
      IndexName: "GSI1-ByDate",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "GAMES",
      },
      Limit: 100,
    })
  );

  const playerNames = new Set<string>();
  for (const item of result.Items || []) {
    const game = await getGame(item.gameId);
    if (game) {
      game.players.forEach((p) => playerNames.add(p.playerName));
    }
  }

  return Array.from(playerNames);
}

export async function getLeaderboard(): Promise<PlayerStats[]> {
  const playerNames = await getAllPlayerNames();
  const stats: PlayerStats[] = [];

  for (const name of playerNames) {
    const playerStats = await calculatePlayerStats(name);
    if (playerStats && playerStats.gamesPlayed >= 1) {
      stats.push(playerStats);
    }
  }

  // Sort by average score descending
  return stats.sort((a, b) => b.averageScore - a.averageScore);
}
