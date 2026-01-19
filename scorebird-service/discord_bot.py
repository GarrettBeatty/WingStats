"""
WingStats Discord Bot
Allows users to submit Wingspan scorecard screenshots via Discord.
Tag the bot with an image attachment to parse and record a game.
"""

import asyncio
import base64
import json
import os
import re
from datetime import datetime, timezone
from typing import Optional

import aiohttp
import discord
from discord import app_commands

# Configuration from environment variables
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000/api")
SCOREBIRD_URL = os.getenv("SCOREBIRD_URL", "http://localhost:8000")
PLAYERS_JSON_PATH = os.getenv("PLAYERS_JSON_PATH", "/app/ScoreBird/signups/players.json")

# Discord intents
intents = discord.Intents.default()
intents.message_content = True
intents.messages = True


class WingStatsBot(discord.Client):
    def __init__(self):
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
        self.player_mappings: dict[str, list[str]] = {}
        self._load_player_mappings()

    def _load_player_mappings(self):
        """Load Discord username to Wingspan name mappings."""
        try:
            if os.path.exists(PLAYERS_JSON_PATH):
                with open(PLAYERS_JSON_PATH, "r") as f:
                    self.player_mappings = json.load(f)
                print(f"Loaded {len(self.player_mappings)} player mappings")
            else:
                print(f"No players.json found at {PLAYERS_JSON_PATH}")
        except Exception as e:
            print(f"Failed to load player mappings: {e}")

    def _save_player_mappings(self):
        """Save player mappings back to file."""
        try:
            with open(PLAYERS_JSON_PATH, "w") as f:
                json.dump(self.player_mappings, f, indent=2)
        except Exception as e:
            print(f"Failed to save player mappings: {e}")

    def get_wingspan_names(self, discord_username: str) -> list[str]:
        """Get Wingspan names for a Discord user."""
        # Normalize username (lowercase, no leading dots)
        normalized = discord_username.lower().lstrip(".")

        for key, value in self.player_mappings.items():
            if key.lower().lstrip(".") == normalized:
                return value.get("wingspan name", [])
        return []

    def find_best_player_match(self, parsed_name: str) -> Optional[str]:
        """
        Try to match a parsed player name to a known Wingspan name.
        Returns the canonical name if found, otherwise the original.
        """
        parsed_lower = parsed_name.lower().strip()

        for discord_user, data in self.player_mappings.items():
            wingspan_names = data.get("wingspan name", [])
            for ws_name in wingspan_names:
                if ws_name.lower() == parsed_lower:
                    # Return the first (canonical) Wingspan name
                    return wingspan_names[0]

        return parsed_name

    async def setup_hook(self):
        """Called when bot is ready, syncs slash commands."""
        await self.tree.sync()
        print("Slash commands synced!")


bot = WingStatsBot()


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"ScoreBird URL: {SCOREBIRD_URL}")
    print("------")


@bot.event
async def on_message(message: discord.Message):
    # Ignore messages from the bot itself
    if message.author == bot.user:
        return

    # Check if bot is mentioned
    if bot.user not in message.mentions:
        return

    # Check for image attachments
    image_attachments = [
        att for att in message.attachments
        if att.content_type and att.content_type.startswith("image/")
    ]

    if not image_attachments:
        await message.reply(
            "Please attach a Wingspan scorecard image when tagging me!\n"
            "Example: `@WingStats` with an image attached"
        )
        return

    # Process the first image
    attachment = image_attachments[0]

    # Send initial response
    processing_msg = await message.reply("Parsing scorecard... please wait.")

    try:
        async with aiohttp.ClientSession() as session:
            # Download the image
            async with session.get(attachment.url) as resp:
                if resp.status != 200:
                    await processing_msg.edit(content="Failed to download image.")
                    return
                image_bytes = await resp.read()

            # Convert to base64
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")

            # Call ScoreBird parse endpoint
            async with session.post(
                f"{SCOREBIRD_URL}/parse",
                json={"image": image_b64},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    await processing_msg.edit(
                        content=f"ScoreBird parsing failed: {error_text}"
                    )
                    return
                parse_result = await resp.json()

            if not parse_result.get("success"):
                await processing_msg.edit(
                    content="Could not parse the scorecard. Please try a clearer image."
                )
                return

            players = parse_result.get("players", [])
            winners = parse_result.get("winners", [])

            if not players:
                await processing_msg.edit(
                    content="No players found in the scorecard. Is this a valid Wingspan score screen?"
                )
                return

            # Map parsed names to known player names
            for player in players:
                original_name = player["name"]
                matched_name = bot.find_best_player_match(original_name)
                player["name"] = matched_name

            # Transform scores to API format
            api_players = []
            for player in players:
                scores = player.get("scores", {})
                api_players.append({
                    "name": player["name"],
                    "birds": scores.get("bird_points", 0),
                    "bonus": scores.get("bonus", 0),
                    "endOfRound": scores.get("end_of_round", 0),
                    "eggs": scores.get("egg", 0),
                    "cachedFood": scores.get("cache", 0),
                    "tuckedCards": scores.get("tuck", 0),
                    "nectar": scores.get("nectar", 0),
                })

            # Create the game via API
            game_data = {
                "playedAt": datetime.now(timezone.utc).isoformat(),
                "players": api_players,
                "uploadedBy": f"Discord:{message.author.name}",
            }

            async with session.post(
                f"{API_BASE_URL}/games",
                json=game_data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status not in (200, 201):
                    error_text = await resp.text()
                    await processing_msg.edit(
                        content=f"Failed to save game: {error_text}"
                    )
                    return
                game_response = await resp.json()

            game = game_response.get("game", {})
            game_id = game.get("id", "unknown")

            # Build response message
            response_lines = ["**Game Recorded!**\n"]

            # Sort players by total score descending
            sorted_players = sorted(
                players,
                key=lambda p: p.get("total", 0),
                reverse=True
            )

            for i, player in enumerate(sorted_players, 1):
                medal = ""
                if i == 1:
                    medal = " :first_place:"
                elif i == 2:
                    medal = " :second_place:"
                elif i == 3:
                    medal = " :third_place:"

                response_lines.append(
                    f"{i}. **{player['name']}** - {player.get('total', 0)} pts{medal}"
                )

            # Update winners list with mapped names
            mapped_winners = [bot.find_best_player_match(w) for w in winners]
            if mapped_winners:
                response_lines.append(f"\n:trophy: Winner: **{', '.join(mapped_winners)}**")

            response_lines.append(f"\n`Game ID: {game_id}`")

            await processing_msg.edit(content="\n".join(response_lines))

    except asyncio.TimeoutError:
        await processing_msg.edit(content="Request timed out. Please try again.")
    except Exception as e:
        print(f"Error processing scorecard: {e}")
        await processing_msg.edit(content=f"An error occurred: {str(e)}")


# Slash Commands

@bot.tree.command(name="stats", description="Get stats for a player")
@app_commands.describe(player_name="The player's Wingspan name")
async def stats_command(interaction: discord.Interaction, player_name: str):
    await interaction.response.defer()

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{API_BASE_URL}/players/{player_name}",
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status == 404:
                    await interaction.followup.send(f"Player '{player_name}' not found.")
                    return
                if resp.status != 200:
                    await interaction.followup.send("Failed to fetch player stats.")
                    return
                data = await resp.json()

        player = data.get("player", {})
        stats = player.get("stats", {})

        embed = discord.Embed(
            title=f"Stats for {player_name}",
            color=discord.Color.blue()
        )
        embed.add_field(name="Games Played", value=stats.get("gamesPlayed", 0), inline=True)
        embed.add_field(name="Wins", value=stats.get("totalWins", 0), inline=True)
        embed.add_field(name="Win Rate", value=f"{stats.get('winRate', 0):.1f}%", inline=True)
        embed.add_field(name="Avg Score", value=f"{stats.get('averageScore', 0):.1f}", inline=True)
        embed.add_field(name="High Score", value=stats.get("highScore", 0), inline=True)
        embed.add_field(name="Low Score", value=stats.get("lowScore", 0), inline=True)

        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"Error fetching stats: {str(e)}")


@bot.tree.command(name="leaderboard", description="Show the WingStats leaderboard")
async def leaderboard_command(interaction: discord.Interaction):
    await interaction.response.defer()

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{API_BASE_URL}/players",
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status != 200:
                    await interaction.followup.send("Failed to fetch leaderboard.")
                    return
                data = await resp.json()

        players = data.get("players", [])[:10]  # Top 10

        if not players:
            await interaction.followup.send("No players found in the leaderboard.")
            return

        embed = discord.Embed(
            title="WingStats Leaderboard",
            description="Top 10 players by average score",
            color=discord.Color.gold()
        )

        leaderboard_text = []
        for i, player in enumerate(players, 1):
            medal = ""
            if i == 1:
                medal = ":first_place: "
            elif i == 2:
                medal = ":second_place: "
            elif i == 3:
                medal = ":third_place: "

            stats = player.get("stats", {})
            leaderboard_text.append(
                f"{medal}**{i}. {player.get('name', 'Unknown')}** - "
                f"Avg: {stats.get('averageScore', 0):.1f} | "
                f"Games: {stats.get('gamesPlayed', 0)} | "
                f"Wins: {stats.get('totalWins', 0)}"
            )

        embed.description = "\n".join(leaderboard_text)
        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"Error fetching leaderboard: {str(e)}")


@bot.tree.command(name="register", description="Register your Discord username to a Wingspan name")
@app_commands.describe(wingspan_name="Your in-game Wingspan name")
async def register_command(interaction: discord.Interaction, wingspan_name: str):
    discord_username = interaction.user.name.lower()

    # Check if already registered
    existing_names = bot.get_wingspan_names(discord_username)

    if wingspan_name in existing_names:
        await interaction.response.send_message(
            f"'{wingspan_name}' is already registered to your Discord account.",
            ephemeral=True
        )
        return

    # Add mapping
    if discord_username not in bot.player_mappings:
        bot.player_mappings[discord_username] = {"wingspan name": []}

    bot.player_mappings[discord_username]["wingspan name"].append(wingspan_name)
    bot._save_player_mappings()

    all_names = bot.player_mappings[discord_username]["wingspan name"]
    await interaction.response.send_message(
        f"Registered '{wingspan_name}' to your Discord account!\n"
        f"Your registered names: {', '.join(all_names)}",
        ephemeral=True
    )


@bot.tree.command(name="mynames", description="Show your registered Wingspan names")
async def mynames_command(interaction: discord.Interaction):
    discord_username = interaction.user.name.lower()
    names = bot.get_wingspan_names(discord_username)

    if not names:
        await interaction.response.send_message(
            "You haven't registered any Wingspan names yet.\n"
            "Use `/register <wingspan_name>` to register your name.",
            ephemeral=True
        )
    else:
        await interaction.response.send_message(
            f"Your registered Wingspan names: {', '.join(names)}",
            ephemeral=True
        )


@bot.tree.command(name="recent", description="Show recent games")
@app_commands.describe(count="Number of games to show (default: 5, max: 10)")
async def recent_command(interaction: discord.Interaction, count: int = 5):
    await interaction.response.defer()

    count = min(max(1, count), 10)  # Clamp between 1 and 10

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{API_BASE_URL}/games?limit={count}",
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status != 200:
                    await interaction.followup.send("Failed to fetch recent games.")
                    return
                data = await resp.json()

        games = data.get("games", [])

        if not games:
            await interaction.followup.send("No games found.")
            return

        embed = discord.Embed(
            title=f"Recent Games (Last {len(games)})",
            color=discord.Color.green()
        )

        for game in games:
            players = game.get("players", [])
            # Sort by score
            players_sorted = sorted(
                players,
                key=lambda p: p.get("totalScore", 0),
                reverse=True
            )

            player_lines = []
            for p in players_sorted:
                winner_mark = " :trophy:" if p.get("isWinner") else ""
                player_lines.append(
                    f"{p.get('playerName', 'Unknown')}: {p.get('totalScore', 0)}{winner_mark}"
                )

            played_at = game.get("playedAt", "Unknown date")
            # Parse and format date
            try:
                dt = datetime.fromisoformat(played_at.replace("Z", "+00:00"))
                date_str = dt.strftime("%b %d, %Y")
            except:
                date_str = played_at[:10] if len(played_at) >= 10 else played_at

            embed.add_field(
                name=date_str,
                value="\n".join(player_lines) if player_lines else "No players",
                inline=False
            )

        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"Error fetching games: {str(e)}")


def main():
    if not DISCORD_TOKEN:
        print("ERROR: DISCORD_BOT_TOKEN environment variable not set!")
        print("Set it with: export DISCORD_BOT_TOKEN='your-token-here'")
        return

    print("Starting WingStats Discord Bot...")
    bot.run(DISCORD_TOKEN)


if __name__ == "__main__":
    main()
