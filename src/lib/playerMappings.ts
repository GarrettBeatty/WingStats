/**
 * Player Mappings Utility
 * Maps Discord usernames to Wingspan in-game names for stats aggregation
 */

// Player mappings data - loaded from players.json structure
// Discord username (lowercase) -> wingspan names
const playerMappings: Record<string, { "wingspan name": string[] }> = {
  acorbs: {
    "wingspan name": ["Acorbs", "Acorbs1"],
  },
  pattydykerthebiker: {
    "wingspan name": ["partypatrick", "pattydykes"],
  },
  azmal9739: {
    "wingspan name": ["Azbueno", "Azmosis-Jones", "Azmal-The-Octopus"],
  },
  ".lex22": {
    "wingspan name": ["itslex22"],
  },
  motherduck1234569: {
    "wingspan name": ["motherduck69"],
  },
  sonofamonkey427: {
    "wingspan name": ["sonofamonkey"],
  },
  kingktroll: {
    "wingspan name": ["kingktroll", "kingktroll2"],
  },
  mediumcheese: {
    "wingspan name": ["MobileCheese", "NotSoBigCheese"],
  },
};

// Build reverse lookup map: wingspan name (lowercase) -> discord username
const wingspanToDiscordMap: Map<string, string> = new Map();
for (const [discordUsername, data] of Object.entries(playerMappings)) {
  for (const wingspanName of data["wingspan name"]) {
    wingspanToDiscordMap.set(wingspanName.toLowerCase(), discordUsername);
  }
}

/**
 * Get the Discord username for a given Wingspan name
 * @param wingspanName The Wingspan in-game name
 * @returns The Discord username if registered, null otherwise
 */
export function getDiscordUsername(wingspanName: string): string | null {
  return wingspanToDiscordMap.get(wingspanName.toLowerCase()) || null;
}

/**
 * Get all Wingspan names registered to a Discord user
 * @param discordUsername The Discord username
 * @returns Array of Wingspan names, empty if not registered
 */
export function getWingspanNames(discordUsername: string): string[] {
  const normalized = discordUsername.toLowerCase();
  const data = playerMappings[normalized];
  return data ? data["wingspan name"] : [];
}

/**
 * Get all registered Discord users
 * @returns Array of Discord usernames
 */
export function getAllDiscordUsers(): string[] {
  return Object.keys(playerMappings);
}

/**
 * Check if a name is a registered Discord username
 * @param name The name to check
 * @returns True if it's a registered Discord username
 */
export function isDiscordUser(name: string): boolean {
  return name.toLowerCase() in playerMappings;
}

/**
 * Get the display name for a player
 * For registered players, returns Discord username
 * For unregistered players, returns the Wingspan name as-is
 * @param wingspanName The Wingspan in-game name
 * @returns The display name (Discord username or original name)
 */
export function getDisplayName(wingspanName: string): string {
  const discordUsername = getDiscordUsername(wingspanName);
  return discordUsername || wingspanName;
}

/**
 * Normalize a name for lookup - handles both Discord and Wingspan names
 * @param name Either a Discord username or Wingspan name
 * @returns Object with the resolved Discord username (if registered) and all associated Wingspan names
 */
export function resolvePlayerIdentity(name: string): {
  discordUsername: string | null;
  wingspanNames: string[];
  isRegistered: boolean;
} {
  // First check if it's a Discord username
  if (isDiscordUser(name)) {
    return {
      discordUsername: name.toLowerCase(),
      wingspanNames: getWingspanNames(name),
      isRegistered: true,
    };
  }

  // Check if it's a Wingspan name
  const discordUsername = getDiscordUsername(name);
  if (discordUsername) {
    return {
      discordUsername,
      wingspanNames: getWingspanNames(discordUsername),
      isRegistered: true,
    };
  }

  // Not registered - treat as standalone Wingspan name
  return {
    discordUsername: null,
    wingspanNames: [name],
    isRegistered: false,
  };
}
