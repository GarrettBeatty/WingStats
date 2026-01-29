"""
WingStats Discord Bot
Allows users to submit Wingspan scorecard screenshots via Discord.
Tag the bot with an image attachment to parse and record a game.
"""

import asyncio
import base64
import json
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import aiohttp
import discord
from discord import app_commands
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(Path(__file__).parent / ".env")

# Configuration from environment variables
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000/api")
SCOREBIRD_URL = os.getenv("SCOREBIRD_URL", "http://localhost:8000")
PLAYERS_JSON_PATH = os.getenv("PLAYERS_JSON_PATH", "/app/ScoreBird/signups/players.json")
SITE_BASE_URL = os.getenv("SITE_BASE_URL", "https://wingstats.beatty.codes")
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY", "")

# Discord intents
intents = discord.Intents.default()
intents.message_content = True
intents.messages = True
intents.members = True  # Required to look up guild members for pings


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

    def get_discord_username_for_wingspan_name(self, wingspan_name: str) -> Optional[str]:
        """
        Reverse lookup: find Discord username from a Wingspan name.
        """
        ws_lower = wingspan_name.lower().strip()

        for discord_user, data in self.player_mappings.items():
            wingspan_names = data.get("wingspan name", [])
            for ws_name in wingspan_names:
                if ws_name.lower() == ws_lower:
                    return discord_user

        return None

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
    print(f"Giphy API Key: {'configured' if GIPHY_API_KEY else 'NOT SET'}")
    print("------")


@bot.event
async def on_message(message: discord.Message):
    # Ignore messages from the bot itself
    if message.author == bot.user:
        return

    # Check if bot is mentioned
    if bot.user not in message.mentions:
        return

    # Check for image attachments in the current message
    image_attachments = [
        att for att in message.attachments
        if att.content_type and att.content_type.startswith("image/")
    ]

    # If no images in current message, check if replying to a message with images
    if not image_attachments and message.reference:
        try:
            # Fetch the referenced (replied-to) message
            referenced_msg = await message.channel.fetch_message(message.reference.message_id)
            image_attachments = [
                att for att in referenced_msg.attachments
                if att.content_type and att.content_type.startswith("image/")
            ]
        except discord.NotFound:
            pass  # Referenced message was deleted

    if not image_attachments:
        await message.reply(
            "Please attach a Wingspan scorecard image when tagging me!\n"
            "You can also reply to a message that has a scorecard image."
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
                error_detail = parse_result.get("error", "Unknown error")
                await processing_msg.edit(
                    content=f"Could not parse the scorecard: {error_detail}"
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
                    "birds": scores.get("bird_points") or 0,
                    "bonus": scores.get("bonus") or 0,
                    "endOfRound": scores.get("end_of_round") or 0,
                    "eggs": scores.get("egg") or 0,
                    "cachedFood": scores.get("cache") or 0,
                    "tuckedCards": scores.get("tuck") or 0,
                    "nectar": scores.get("nectar") or 0,
                    "duetTokens": scores.get("duet_pts") or 0,
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

            # Calculate ranks with tie handling (competition ranking: 1, 1, 3)
            prev_score = None
            rank = 0
            for i, player in enumerate(sorted_players, 1):
                score = player.get('total', 0)
                if score != prev_score:
                    rank = i  # New rank when score differs
                prev_score = score

                medal = ""
                if rank == 1:
                    medal = " :first_place:"
                elif rank == 2:
                    medal = " :second_place:"
                elif rank == 3:
                    medal = " :third_place:"

                response_lines.append(
                    f"{rank}. **{player['name']}** - {score} pts{medal}"
                )

            # Ping players who scored under 100
            low_score_mentions = []
            for player in sorted_players:
                if player.get("total", 0) < 100:
                    print(f"Low score detected: {player['name']} with {player.get('total', 0)} pts")
                    discord_username = bot.get_discord_username_for_wingspan_name(player["name"])
                    if discord_username and message.guild:
                        member = discord.utils.find(
                            lambda m: m.name.lower() == discord_username.lower().lstrip("."),
                            message.guild.members
                        )
                        if member:
                            low_score_mentions.append(member.mention)
                        else:
                            print(f"Could not find guild member for username: {discord_username}")
                    else:
                        print(f"No discord username mapping found for: {player['name']}")

            # Update winners list with mapped names
            mapped_winners = [bot.find_best_player_match(w) for w in winners]
            if mapped_winners:
                response_lines.append(f"\n:trophy: Winner: **{', '.join(mapped_winners)}**")

            game_url = f"{SITE_BASE_URL}/games/{game_id}"
            response_lines.append(f"\n:link: {game_url}")

            await processing_msg.edit(content="\n".join(response_lines))

            print(f"Low score mentions: {len(low_score_mentions)}")
            if low_score_mentions:
                low_score_phrases = [
                    ("you almost had it buddy maybe next time", "almost had it"),
                    ("looks like early bird does not catch the worm", "early bird fail"),
                    ("how disappointing!", "disappointed"),
                    ("did you even try?", "did you even try"),
                    ("the birds are crying for you", "crying bird"),
                    ("that's not flying, that's falling with style", "falling with style"),
                    ("even a penguin could score higher", "penguin fail"),
                    ("skill issue", "skill issue"),
                    ("maybe try checkers instead", "you stink"),
                    ("the nest egg is looking a little empty", "empty nest"),
                    ("were you playing with your eyes closed?", "eyes closed"),
                    ("not your finest migration", "bad migration"),
                    ("even garrett could've scored better than this", "you suck"),
                    ("honk honk", "clown"),
                ]
                phrase, search_term = random.choice(low_score_phrases)
                gif_url = ""
                print(f"Searching Giphy for: {search_term}")
                if GIPHY_API_KEY:
                    try:
                        async with aiohttp.ClientSession() as session:
                            params = {
                                "api_key": GIPHY_API_KEY,
                                "tag": search_term,
                                "rating": "pg-13",
                            }
                            async with session.get("https://api.giphy.com/v1/gifs/random", params=params) as resp:
                                if resp.status == 200:
                                    data = await resp.json()
                                    gif_url = data.get("data", {}).get("images", {}).get("original", {}).get("url", "")
                                else:
                                    print(f"Giphy API returned status {resp.status}: {await resp.text()}")
                    except Exception as e:
                        print(f"Error fetching GIF from Giphy: {e}")
                msg = f"{' '.join(low_score_mentions)} {phrase}"
                if gif_url:
                    msg += f"\n{gif_url}"
                    print(f"Sending GIF: {gif_url}")
                else:
                    print("No GIF URL obtained, sending message without GIF")
                await message.channel.send(msg)

    except asyncio.TimeoutError:
        await processing_msg.edit(content="Request timed out. Please try again.")
    except Exception as e:
        print(f"Error processing scorecard: {e}")
        await processing_msg.edit(content=f"An error occurred: {str(e)}")


# Slash Commands

@bot.tree.command(name="stats", description="Get stats for a player")
@app_commands.describe(
    user="Tag a Discord user to see their stats",
    player_name="Or type a player name (Discord username or Wingspan name)"
)
async def stats_command(
    interaction: discord.Interaction,
    user: Optional[discord.User] = None,
    player_name: Optional[str] = None
):
    await interaction.response.defer()

    # Determine lookup name from user mention, player_name string, or default to self
    if user:
        # Discord user was tagged - use their username
        lookup_name = user.name.lower()
    elif player_name:
        lookup_name = player_name
        # Strip @ prefix if someone typed it manually
        if lookup_name.startswith("@"):
            lookup_name = lookup_name[1:]
        # Handle Discord mention format <@123456789>
        if lookup_name.startswith("<@") and lookup_name.endswith(">"):
            # Can't resolve ID to username without API call, ask user to use the user parameter
            await interaction.followup.send(
                "Please use the `user` parameter to tag a Discord user, "
                "or type their username/Wingspan name directly."
            )
            return
    else:
        # Default to the command user's Discord username
        lookup_name = interaction.user.name.lower()

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{API_BASE_URL}/players/{quote(lookup_name, safe='')}",
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status == 404:
                    if player_name:
                        await interaction.followup.send(f"Player '{player_name}' not found.")
                    else:
                        await interaction.followup.send(
                            "No stats found for your Discord account. "
                            "Use `/register <wingspan_name>` to link your Wingspan name."
                        )
                    return
                if resp.status != 200:
                    await interaction.followup.send("Failed to fetch player stats.")
                    return
                data = await resp.json()

        stats = data.get("stats", {})
        identity = data.get("identity", {})

        # Use Discord username if registered, otherwise the player name
        display_name = identity.get("discordUsername") or stats.get("playerName", lookup_name)
        aliases = identity.get("wingspanNames", [])

        embed = discord.Embed(
            title=f"Stats for {display_name}",
            color=discord.Color.blue()
        )

        # Show aliases if registered with multiple names
        if len(aliases) > 1:
            embed.description = f"*Accounts: {', '.join(aliases)}*"

        embed.add_field(name="Games Played", value=stats.get("gamesPlayed", 0), inline=True)
        embed.add_field(name="Wins", value=stats.get("totalWins", 0), inline=True)

        win_rate = stats.get("winRate", 0)
        # winRate comes as a decimal (0.0-1.0), convert to percentage
        win_rate_pct = win_rate * 100 if win_rate <= 1 else win_rate
        embed.add_field(name="Win Rate", value=f"{win_rate_pct:.1f}%", inline=True)

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
        prev_avg = None
        rank = 0
        for i, player in enumerate(players, 1):
            # Handle new format: player stats are at top level, not nested in 'stats'
            # Use Discord username if available, otherwise playerName
            display_name = player.get("discordUsername") or player.get("playerName", "Unknown")
            avg_score = player.get("averageScore", 0)
            games_played = player.get("gamesPlayed", 0)
            total_wins = player.get("totalWins", 0)
            aliases = player.get("aliases", [])

            # Calculate rank with tie handling
            if avg_score != prev_avg:
                rank = i
            prev_avg = avg_score

            medal = ""
            if rank == 1:
                medal = ":first_place: "
            elif rank == 2:
                medal = ":second_place: "
            elif rank == 3:
                medal = ":third_place: "

            # Show account count if multiple
            account_info = f" ({len(aliases)} accounts)" if len(aliases) > 1 else ""

            leaderboard_text.append(
                f"{medal}**{rank}. {display_name}**{account_info} - "
                f"Avg: {avg_score:.1f} | "
                f"Games: {games_played} | "
                f"Wins: {total_wins}"
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
