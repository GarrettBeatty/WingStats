# WingStats

A Wingspan board game score tracking application with OCR-powered scorecard parsing via Discord bot integration.

## Architecture

- **Next.js App** - Web frontend and API (`/`)
- **ScoreBird Service** - Python OCR service for parsing Wingspan scorecards (`/scorebird-service`)
- **Discord Bot** - Submit scorecards via Discord, runs alongside ScoreBird

## Local Development

### Prerequisites

- Node.js 20+
- npm
- AWS credentials with DynamoDB access

### Environment Variables

Create a `.env` file in the project root:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DISCORD_BOT_TOKEN=your-discord-bot-token
```

### Run with npm (Next.js only)

```bash
npm install
npm run dev
```

App runs at http://localhost:3001

### Run with Docker (Full Stack)

Runs the Next.js app, ScoreBird OCR service, and Discord bot together:

```bash
docker compose up --build
```

| Service | Port | Description |
|---------|------|-------------|
| `wingstats-app` | 3000 | Next.js web app |
| `wingstats-scorebird` | 8000 (internal) | OCR image parser |
| `wingstats-discord-bot` | - | Discord bot |

**Useful commands:**

```bash
docker compose up --build -d   # Run in background
docker compose logs -f         # View logs
docker compose down            # Stop all services
docker compose build --no-cache  # Rebuild from scratch
```

## AWS Deployment

The app deploys to EC2 via GitHub Actions, using ECR for container images and Caddy for HTTPS.

### 1. Create ECR Repositories

```bash
aws ecr create-repository --repository-name wingstats --region us-east-1
aws ecr create-repository --repository-name wingstats-scorebird --region us-east-1
```

### 2. Set Up EC2 Instance

1. Launch an EC2 instance (Amazon Linux 2023 or Ubuntu recommended)
2. Install Docker and AWS CLI:

   ```bash
   # Amazon Linux
   sudo yum install -y docker aws-cli
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER

   # Ubuntu
   sudo apt update && sudo apt install -y docker.io awscli
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER
   ```

3. Log out and back in for docker group to take effect

4. Create the app directory:

   ```bash
   mkdir -p ~/wingstats
   ```

5. Copy deployment files to EC2:

   ```bash
   scp deploy/docker-compose.yml deploy/Caddyfile ec2-user@your-ec2-ip:~/wingstats/
   scp scorebird-service/players.json ec2-user@your-ec2-ip:~/wingstats/
   ```

### 3. Configure DNS

Point your domain's A record to the EC2 instance's public IP address.

### 4. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key with ECR push permissions | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJalr...` |
| `EC2_HOST` | EC2 public IP or hostname | `54.123.45.67` |
| `EC2_USER` | SSH username | `ec2-user` or `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key (entire contents) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DOMAIN` | Your domain name | `wingstats.beatty.codes` |
| `DISCORD_BOT_TOKEN` | Discord bot token | `MTIz...` |

### 5. IAM Permissions

The AWS credentials need these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

### 6. Deploy

Push to the `main` branch to trigger automatic deployment, or manually trigger the workflow from GitHub Actions.

### Production Architecture

```
Internet
    │
    ▼
┌─────────┐
│  Caddy  │ :80/:443 (auto HTTPS)
└────┬────┘
     │
     ▼
┌─────────┐     ┌───────────┐     ┌─────────────┐
│ Next.js │────▶│ ScoreBird │◀────│ Discord Bot │
│  :3000  │     │   :8000   │     │             │
└─────────┘     └───────────┘     └─────────────┘
     │
     ▼
┌──────────┐
│ DynamoDB │
└──────────┘
```

## Discord Bot Commands

- **@WingStats + image** - Parse a Wingspan scorecard and record the game
- `/stats <player>` - Get stats for a player
- `/leaderboard` - Show top 10 players
- `/recent [count]` - Show recent games
- `/register <name>` - Register your Discord username to a Wingspan name
- `/mynames` - Show your registered Wingspan names

## Infrastructure (CDK)

DynamoDB tables are managed via AWS CDK in the `/infra` directory:

```bash
cd infra
npm install
npx cdk deploy
```
