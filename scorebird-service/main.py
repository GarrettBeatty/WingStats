"""
ScoreBird FastAPI Service
Wraps the ScoreBird library to parse Wingspan score screenshots.
"""

import base64
import io
import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

# Import ScoreBird - fail if not available
try:
    from src.scoreboard_reader.scorebird import scorebird as parse_scorebird_image
    from src.scoreboard_reader.scoreboard import Scoreboard
    print("ScoreBird loaded successfully!")
except ImportError as e:
    raise ImportError(f"ScoreBird import failed: {e}. Check PYTHONPATH and module structure.")
except Exception as e:
    raise RuntimeError(f"ScoreBird error: {type(e).__name__}: {e}")

app = FastAPI(
    title="ScoreBird Service",
    description="Parse Wingspan score screenshots using OCR",
    version="1.0.0",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParseRequest(BaseModel):
    image: str  # Base64 encoded image (with or without data URL prefix)


class PlayerScore(BaseModel):
    name: str
    scores: dict
    total: int


class ParseResponse(BaseModel):
    players: list[PlayerScore]
    winners: list[str]
    success: bool
    error: Optional[str] = None
    debug_image: Optional[str] = None  # Base64 annotated image showing parsed regions


def decode_base64_image(base64_string: str) -> Image.Image:
    """Decode a base64 string to PIL Image."""
    # Remove data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]

    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data))


def parse_with_scorebird(image: Image.Image, debug: bool = False) -> dict:
    """Parse scorecard using the actual ScoreBird library."""
    import tempfile
    import cv2
    import numpy as np

    # Save image to temp file (ScoreBird expects file path)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        image.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Use the scorebird function to parse
        print(f"Parsing image: {tmp_path}")
        try:
            result = parse_scorebird_image(tmp_path)
            print(f"Parse result: {result}")
        except Exception as parse_err:
            import traceback
            print(f"ScoreBird parse error: {parse_err}")
            traceback.print_exc()
            raise

        debug_image_b64 = None

        # If debug mode, get the annotated image from Scoreboard
        if debug and Scoreboard is not None:
            try:
                sb = Scoreboard([])  # Empty list for mentioned_players
                sb.readImage(tmp_path)
                sb.findScoreboardRectangle()
                sb.findScoreboardFeathers()
                sb.findFinalScores()
                sb.decipherFinalScores()
                sb.findDetailedScores()

                # Get the annotated image
                if hasattr(sb, 'img_scoreboard_bgr') and sb.img_scoreboard_bgr is not None:
                    # Convert BGR to RGB for PIL
                    img_rgb = cv2.cvtColor(sb.img_scoreboard_bgr, cv2.COLOR_BGR2RGB)
                    debug_pil = Image.fromarray(img_rgb)

                    # Convert to base64
                    buffer = io.BytesIO()
                    debug_pil.save(buffer, format="PNG")
                    debug_image_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            except Exception as e:
                print(f"Debug image generation failed: {e}")

        # Transform result to our format
        # ScoreBird returns: {'players': {'player1': {'name': X, 'score': Y, 'details': {...}}, ...}, 'winner': [...]}
        players = []
        if result and "players" in result:
            players_dict = result.get("players", {})
            for player_key, player_data in players_dict.items():
                details = player_data.get("details", {})
                players.append({
                    "name": player_data.get("name") or player_key,
                    "scores": {
                        "bird_points": details.get("bird_pts", 0),
                        "bonus": details.get("bonus_pts", 0),
                        "end_of_round": details.get("eor_pts", 0),
                        "egg": details.get("egg_pts", 0),
                        "cache": details.get("cache_pts", 0),
                        "tuck": details.get("tuck_pts", 0),
                        "nectar": details.get("nectar_pts", 0),
                        "duet_pts": details.get("duet_pts", 0),
                    },
                    "total": player_data.get("score", 0),
                })

        # Get winners (filter out None values)
        winners = [w for w in result.get("winner", []) if w] if result else []

        return {
            "players": players,
            "winners": winners,
            "success": True,
            "debug_image": debug_image_b64,
        }
    finally:
        # Clean up temp file
        os.unlink(tmp_path)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/parse", response_model=ParseResponse)
async def parse_scorecard(request: ParseRequest):
    """
    Parse a Wingspan scorecard image.

    Expects a base64-encoded image (with or without data URL prefix).
    Set debug=true to receive an annotated image showing parsed regions.
    Returns extracted player names, scores, and winners.
    """
    try:
        # Decode the image
        image = decode_base64_image(request.image)

        # Parse using ScoreBird
        result = parse_with_scorebird(image, debug=True)

        return ParseResponse(**result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse image: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
