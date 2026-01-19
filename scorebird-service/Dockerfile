# ScoreBird Service Dockerfile
FROM python:3.11-slim

# Install system dependencies for OpenCV and Tesseract
RUN apt-get update --fix-missing && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone ScoreBird from GitHub (not a pip package)
RUN git clone --depth 1 https://github.com/Bargoff/ScoreBird.git /app/ScoreBird

# Set PYTHONPATH to include ScoreBird root (code uses "from src.x import y")
ENV PYTHONPATH="${PYTHONPATH}:/app/ScoreBird"

# Copy application code
COPY main.py .

# Expose port
EXPOSE 8000

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
