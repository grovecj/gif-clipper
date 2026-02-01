# Gif Clipper

A cross-platform screen capture to GIF application. Select a region, record your screen, and get a shareable link.

## Prerequisites

- Node.js 18+
- Java 21
- Docker and Docker Compose

## Running Locally

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5433 with database `gifclipper`.

### 2. Start the Backend

```bash
cd backend

# First time only: copy the example config
cp src/main/resources/application-local.yml.example src/main/resources/application-local.yml

# Start the backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

The API will be available at http://localhost:8080.

### 3. Start the Desktop App

```bash
cd desktop-app
npm install
npm run start
```

The Electron app will launch with hot reload enabled.

## Usage

1. Press `Ctrl+Shift+G` (or `Cmd+Shift+G` on macOS) to start a capture
2. Click and drag to select a screen region
3. Wait for the countdown
4. Recording starts automatically (max 30 seconds)
5. Press `Escape` to cancel at any point

## Project Structure

```
gif-clipper/
├── backend/          # Spring Boot API (Kotlin)
├── desktop-app/      # Electron app (TypeScript + React)
└── terraform/        # Infrastructure as code
```

## Stopping Services

```bash
# Stop PostgreSQL
docker-compose down

# Stop and remove data
docker-compose down -v
```

## License

MIT
