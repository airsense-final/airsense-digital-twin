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

# Builder katmanından paketleri kopyala
COPY --from=builder /install /usr/local

# Copy all codes
COPY . .

# Create logs directory
RUN mkdir -p logs && chmod 777 logs

EXPOSE 10002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10002", "--workers", "2"]
