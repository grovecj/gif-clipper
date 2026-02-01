# Gif Clipper - Development Guide

## Project Overview

Gif Clipper is a cross-platform screen capture to GIF application inspired by [Peek](https://github.com/phw/peek) for Linux. It runs on Windows and macOS.

## Architecture

```
gif-clipper/
├── desktop-app/     # Electron + TypeScript + React
├── backend/         # Spring Boot + Kotlin
├── terraform/       # Infrastructure as Code (DO + GitHub)
└── docs/            # Documentation
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Desktop App | Electron, TypeScript, React |
| Screen Capture | Electron desktopCapturer + ffmpeg |
| GIF Encoding | ffmpeg (bundled) |
| Backend API | Spring Boot 3, Kotlin |
| Database | PostgreSQL (shared with mlb-stats) |
| Object Storage | DigitalOcean Spaces |
| Hosting | DigitalOcean App Platform |
| IaC | Terraform |

## Development Commands

### Desktop App
```bash
cd desktop-app
npm install
npm run dev          # Start development mode
npm run build        # Build for production
npm run make         # Create distributable packages
```

### Backend
```bash
cd backend
./gradlew bootRun    # Start development server
./gradlew build      # Build JAR
./gradlew test       # Run tests
```

### Terraform
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Key Features

1. **Hotkey Activation** - Global hotkey to initiate capture (configurable)
2. **Area Selection** - Click and drag to select screen region
3. **Countdown Timer** - Configurable countdown before recording (default 3s)
4. **Screen Recording** - Record selected region (max 30s)
5. **GIF Encoding** - Convert to optimized GIF using ffmpeg
6. **Upload & Share** - Upload to gif.cartergrove.me for sharing

## Configuration

Desktop app settings stored in:
- Windows: `%APPDATA%/gif-clipper/config.json`
- macOS: `~/Library/Application Support/gif-clipper/config.json`

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL JDBC URL
- `DATABASE_USERNAME` - Database user
- `DATABASE_PASSWORD` - Database password
- `DO_SPACES_ENDPOINT` - Spaces API endpoint
- `DO_SPACES_BUCKET` - Bucket name
- `DO_SPACES_ACCESS_KEY` - Spaces access key
- `DO_SPACES_SECRET_KEY` - Spaces secret key
- `GIF_CDN_URL` - CDN base URL for serving GIFs

## API Endpoints

- `POST /api/gifs` - Upload a new GIF
- `GET /api/gifs/{id}` - Get GIF metadata
- `GET /api/gifs/{id}/stats` - Get view statistics
- `DELETE /api/gifs/{id}` - Delete a GIF (with auth)

## Database Schema

```sql
CREATE TABLE gifs (
    id UUID PRIMARY KEY,
    original_filename VARCHAR(255),
    storage_key VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    width INT,
    height INT,
    duration_ms INT,
    view_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);
```

## Deployment

Infrastructure managed via Terraform. See `terraform/` directory.

To deploy:
1. Copy `terraform/terraform.tfvars.example` to `terraform/terraform.tfvars`
2. Fill in credentials
3. Run `terraform apply`

App Platform auto-deploys on push to `main` branch.
