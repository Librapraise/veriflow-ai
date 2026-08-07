# VeriFlow AI — Confidential Compute Gateway Dockerfile
# Pinned base image tag for reproducible build & code measurement digest
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for cryptography & postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

ENV PORT=8000
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
