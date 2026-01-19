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

# Try to import ScoreBird - if not available, we'll use mock data
try:
    from scorebird import ScoreBird
    SCOREBIRD_AVAILABLE = True
except ImportError:
    SCOREBIRD_AVAILABLE = False
    print("WARNING: ScoreBird not installed. Using mock parser.")

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


def decode_base64_image(base64_string: str) -> Image.Image:
    """Decode a base64 string to PIL Image."""
    # Remove data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]

    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data))


def mock_parse_scorecard(image: Image.Image) -> dict:
    """
    Mock parser for testing when ScoreBird is not available.
    Returns sample data that mimics ScoreBird output.
    """
    # In production, you would use the actual ScoreBird library
    return {
        "players": [
            {
                "name": "Player 1",
                "scores": {
                    "bird_points": 45,
                    "bonus": 12,
                    "end_of_round": 8,
                    "egg": 15,
                    "cache": 4,
                    "tuck": 6,
                },
                "total": 90,
            },
            {
                "name": "Player 2",
                "scores": {
                    "bird_points": 38,
                    "bonus": 10,
                    "end_of_round": 7,
                    "egg": 12,
                    "cache": 5,
                    "tuck": 8,
                },
                "total": 80,
            },
        ],
        "winners": ["Player 1"],
        "success": True,
    }


def parse_with_scorebird(image: Image.Image) -> dict:
    """Parse scorecard using the actual ScoreBird library."""
    # Save image to temp file (ScoreBird expects file path)
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        image.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Initialize ScoreBird and parse
        sb = ScoreBird()
        result = sb.parse_scorecard(tmp_path)

        # Transform result to our format
        players = []
        for player_data in result.get("players", []):
            players.append({
                "name": player_data.get("name", "Unknown"),
                "scores": {
                    "bird_points": player_data.get("bird_points", 0),
                    "bonus": player_data.get("bonus", 0),
                    "end_of_round": player_data.get("end_of_round", 0),
                    "egg": player_data.get("egg", 0),
                    "cache": player_data.get("cache", 0),
                    "tuck": player_data.get("tuck", 0),
                },
                "total": player_data.get("total", 0),
            })

        return {
            "players": players,
            "winners": result.get("winners", []),
            "success": True,
        }
    finally:
        # Clean up temp file
        os.unlink(tmp_path)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "scorebird_available": SCOREBIRD_AVAILABLE,
    }


@app.post("/parse", response_model=ParseResponse)
async def parse_scorecard(request: ParseRequest):
    """
    Parse a Wingspan scorecard image.

    Expects a base64-encoded image (with or without data URL prefix).
    Returns extracted player names, scores, and winners.
    """
    try:
        # Decode the image
        image = decode_base64_image(request.image)

        # Parse using ScoreBird or mock
        if SCOREBIRD_AVAILABLE:
            result = parse_with_scorebird(image)
        else:
            result = mock_parse_scorecard(image)

        return ParseResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse image: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
