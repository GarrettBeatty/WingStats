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
import {
  getDiscordUsername,
  getWingspanNames,
  getAllDiscordUsers,
  resolvePlayerIdentity,
} from "./playerMappings";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const docClient = DynamoDBDocumentClient.from(client);

// Table name from CDK
const GAMES_TABLE = process.env.GAMES_TABLE || "wingstats-games";

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
    duetTokens: number;
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
      duetTokens: player.duetTokens,
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
    const discordUsername = getDiscordUsername(player.name);

    await docClient.send(
      new PutCommand({
        TableName: GAMES_TABLE,
        Item: {
          PK: `GAME#${gameId}`,
          SK: `PLAYER#${player.position}`,
          playerId,
          gameId,
          playerName: player.name,
          discordUsername: discordUsername || undefined,
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
      discordUsername: discordUsername || undefined,
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
    discordUsername: item.discordUsername,
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
  limit?: number
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
      ...(limit && { Limit: limit }),
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
  discordUsername?: string;
  aliases?: string[];
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
    duetTokens: 0,
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
      categoryTotals.duetTokens += playerScore.scores.duetTokens || 0;
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
      duetTokens: categoryTotals.duetTokens / gamesPlayed,
    },
  };
}

/**
 * Get all games for a Discord user (across all their registered Wingspan names)
 */
export async function getGamesByDiscordUser(
  discordUsername: string,
  limit?: number
): Promise<Game[]> {
  const wingspanNames = getWingspanNames(discordUsername);
  if (wingspanNames.length === 0) {
    return [];
  }

  // Fetch games for all Wingspan names
  const allGames: Game[] = [];
  const seenGameIds = new Set<string>();

  for (const name of wingspanNames) {
    const games = await getGamesByPlayer(name, limit);
    for (const game of games) {
      if (!seenGameIds.has(game.id)) {
        seenGameIds.add(game.id);
        allGames.push(game);
      }
    }
  }

  // Sort by playedAt descending
  allGames.sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );

  return limit ? allGames.slice(0, limit) : allGames;
}

/**
 * Calculate aggregated stats for a Discord user across all their Wingspan names
 */
export async function calculateDiscordUserStats(
  discordUsername: string
): Promise<PlayerStats | null> {
  const wingspanNames = getWingspanNames(discordUsername);
  if (wingspanNames.length === 0) {
    return null;
  }

  const games = await getGamesByDiscordUser(discordUsername);

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
    duetTokens: 0,
  };

  // Convert to lowercase set for matching
  const wingspanNamesLower = new Set(wingspanNames.map((n) => n.toLowerCase()));

  for (const game of games) {
    // Find the player's score (could be under any of their Wingspan names)
    const playerScore = game.players.find((p) =>
      wingspanNamesLower.has(p.playerName.toLowerCase())
    );
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
      categoryTotals.duetTokens += playerScore.scores.duetTokens || 0;
    }
  }

  const gamesPlayed = games.length;

  return {
    playerName: discordUsername,
    discordUsername,
    aliases: wingspanNames,
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
      duetTokens: categoryTotals.duetTokens / gamesPlayed,
    },
  };
}

/**
 * Calculate stats for a player, automatically using Discord aggregation if registered
 */
export async function calculatePlayerStatsAggregated(
  name: string
): Promise<PlayerStats | null> {
  const identity = resolvePlayerIdentity(name);

  if (identity.isRegistered && identity.discordUsername) {
    return calculateDiscordUserStats(identity.discordUsername);
  }

  // Not registered - use original function
  return calculatePlayerStats(name);
}

/**
 * Get games for a player, automatically using Discord aggregation if registered
 */
export async function getGamesByPlayerAggregated(
  name: string,
  limit?: number
): Promise<Game[]> {
  const identity = resolvePlayerIdentity(name);

  if (identity.isRegistered && identity.discordUsername) {
    return getGamesByDiscordUser(identity.discordUsername, limit);
  }

  // Not registered - use original function
  return getGamesByPlayer(name, limit);
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

  // Track which Discord users we've already processed
  const processedDiscordUsers = new Set<string>();
  // Track which standalone Wingspan names we've processed
  const processedWingspanNames = new Set<string>();

  for (const name of playerNames) {
    const identity = resolvePlayerIdentity(name);

    if (identity.isRegistered && identity.discordUsername) {
      // This is a registered Discord user
      if (processedDiscordUsers.has(identity.discordUsername)) {
        continue; // Already processed
      }
      processedDiscordUsers.add(identity.discordUsername);

      const playerStats = await calculateDiscordUserStats(identity.discordUsername);
      if (playerStats && playerStats.gamesPlayed >= 1) {
        stats.push(playerStats);
      }
    } else {
      // Unregistered Wingspan name - show as individual
      if (processedWingspanNames.has(name.toLowerCase())) {
        continue;
      }
      processedWingspanNames.add(name.toLowerCase());

      const playerStats = await calculatePlayerStats(name);
      if (playerStats && playerStats.gamesPlayed >= 1) {
        stats.push(playerStats);
      }
    }
  }

  // Sort by average score descending
  return stats.sort((a, b) => b.averageScore - a.averageScore);
}

// ============================================
// Game Update/Delete Operations
// ============================================

interface UpdateGameInput {
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
    duetTokens: number;
  }[];
}

export async function updateGame(
  gameId: string,
  input: UpdateGameInput
): Promise<Game | null> {
  // First check if the game exists
  const existingGame = await getGame(gameId);
  if (!existingGame) {
    return null;
  }

  // Delete existing PLAYER# items (player count may change)
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

  for (const item of playersResult.Items || []) {
    await docClient.send(
      new DeleteCommand({
        TableName: GAMES_TABLE,
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      })
    );
  }

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
      duetTokens: player.duetTokens,
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

  // Update game metadata
  await docClient.send(
    new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: {
        PK: `GAME#${gameId}`,
        SK: "METADATA",
      },
      UpdateExpression:
        "SET playedAt = :playedAt, playerCount = :playerCount, winningScore = :winningScore",
      ExpressionAttributeValues: {
        ":playedAt": input.playedAt,
        ":playerCount": input.players.length,
        ":winningScore": maxScore,
      },
    })
  );

  // Create new PLAYER# items
  const playerScores: PlayerScore[] = [];
  for (const player of playersWithScores) {
    const playerId = uuidv4();
    const isWinner = player.totalScore === maxScore;
    const discordUsername = getDiscordUsername(player.name);

    await docClient.send(
      new PutCommand({
        TableName: GAMES_TABLE,
        Item: {
          PK: `GAME#${gameId}`,
          SK: `PLAYER#${player.position}`,
          playerId,
          gameId,
          playerName: player.name,
          discordUsername: discordUsername || undefined,
          position: player.position,
          scores: player.scores,
          totalScore: player.totalScore,
          isWinner,
          playedAt: input.playedAt,
        },
      })
    );

    playerScores.push({
      id: playerId,
      gameId,
      playerName: player.name,
      discordUsername: discordUsername || undefined,
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
    uploadedBy: existingGame.uploadedBy,
    imageUrl: existingGame.imageUrl,
    createdAt: existingGame.createdAt,
    players: playerScores,
  };
}

export async function deleteGame(gameId: string): Promise<boolean> {
  // First check if the game exists
  const existingGame = await getGame(gameId);
  if (!existingGame) {
    return false;
  }

  // Query all items with PK = GAME#{gameId}
  const result = await docClient.send(
    new QueryCommand({
      TableName: GAMES_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `GAME#${gameId}`,
      },
    })
  );

  // Delete all items (metadata and player items)
  for (const item of result.Items || []) {
    await docClient.send(
      new DeleteCommand({
        TableName: GAMES_TABLE,
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      })
    );
  }

  return true;
}
