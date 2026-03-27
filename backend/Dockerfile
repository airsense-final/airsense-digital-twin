FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Security: Create a non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy packages from builder
COPY --from=builder /install /usr/local

# Copy all codes
COPY . .

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 10002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10002", "--workers", "2"]
