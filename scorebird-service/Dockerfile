# ScoreBird Service Dockerfile
FROM python:3.11-slim

# Install system dependencies for OpenCV and Tesseract
RUN apt-get update --fix-missing && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    git \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set Tesseract data path
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone ScoreBird from GitHub (not a pip package)
RUN git clone --depth 1 https://github.com/Bargoff/ScoreBird.git /app/ScoreBird

# Create signups directory for players.json
RUN mkdir -p /app/ScoreBird/signups

# Copy players.json if it exists locally, otherwise create empty one
COPY players.json /app/ScoreBird/signups/players.json

# Set PYTHONPATH to include ScoreBird root (code uses "from src.x import y")
ENV PYTHONPATH="${PYTHONPATH}:/app/ScoreBird"

# Copy application code
COPY main.py .
COPY discord_bot.py .

# Expose port
EXPOSE 8000

# Default: run the FastAPI service
# Use docker-compose to run the Discord bot separately
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
