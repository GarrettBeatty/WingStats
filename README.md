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

## AWS Infrastructure

All AWS infrastructure is managed via CDK in the `/infra` directory.

### Resources Created

| Resource | Description |
|----------|-------------|
| **DynamoDB Table** | `wingstats-games` - Games and player scores with GSIs |
| **ECR Repositories** | `wingstats` and `wingstats-scorebird` container registries |
| **VPC** | Custom VPC with public subnets (no NAT gateway) |
| **EC2 Instance** | `t4g.nano` ARM64 instance with Docker pre-installed |
| **Elastic IP** | Static IP for DNS |
| **Security Group** | Allows ports 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| **IAM Role** | `wingstats-ec2-role` - EC2 access to ECR and DynamoDB |
| **IAM Users** | `wingstats-deploy` (CI/CD), `wingstats-dev` (local dev) |

### Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| EC2 t4g.nano | ~$3.00 |
| EBS 8GB GP3 | ~$0.64 |
| Elastic IP | Free (while attached) |
| DynamoDB | ~$0 (pay per request) |
| ECR | ~$0.10 (storage) |
| **Total** | **~$4/month** |

## Deployment

### 1. Prerequisites

1. Install AWS CDK CLI:
   ```bash
   npm install -g aws-cdk
   ```

2. Configure AWS credentials:
   ```bash
   aws configure
   ```

### 2. Deploy Infrastructure

```bash
cd infra
npm install

# Deploy (key pair is optional)
npx cdk deploy

# Or with domain name for output hints
npx cdk deploy -c domainName=wingstats.beatty.codes

# Or with SSH key pair (create in EC2 > Key Pairs first)
npx cdk deploy -c keyPairName=wingstats-key -c domainName=wingstats.beatty.codes
```

CDK will output:
- `InstancePublicIP` - Use this for your DNS A record
- `SSMCommand` or `SSHCommand` - Command to connect to the instance
- `AppRepositoryUri` - ECR URI for the app image
- `ScorebirdRepositoryUri` - ECR URI for scorebird image
- `DeployUserName` - IAM user for GitHub Actions

### 3. Configure DNS

Point your domain's A record to the `InstancePublicIP` from the CDK output.

### 4. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | `GitHubActionsRoleArn` from CDK output |
| `EC2_HOST` | EC2 Elastic IP |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Private SSH key contents (for deployment) |
| `DOMAIN` | Your domain name (e.g., `wingstats.beatty.codes`) |
| `DISCORD_BOT_TOKEN` | Discord bot token |

**Note:** We use OIDC for AWS authentication - no access keys needed. GitHub Actions assumes the IAM role directly.

### 5. Connect to Instance

**With SSM Session Manager (no key pair needed):**
```bash
aws ssm start-session --target <instance-id>
```

**With SSH (if key pair configured):**
```bash
ssh -i ~/.ssh/wingstats-key.pem ec2-user@<instance-ip>
```

### 6. CI/CD

GitHub Actions automatically builds and deploys on push to `main`:
- Builds ARM64 Docker images using native ARM64 runners
- Pushes to ECR
- Deploys to EC2 via SSH

## Production Architecture

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

All services run as Docker containers on a single `t4g.nano` ARM64 instance.

## CDK Commands

```bash
cd infra

# Preview changes
npx cdk diff

# Deploy
npx cdk deploy

# Destroy all resources (careful!)
npx cdk destroy
```

## Discord Bot Commands

- **@WingStats + image** - Parse a Wingspan scorecard and record the game
- `/stats <player>` - Get stats for a player
- `/leaderboard` - Show top 10 players
- `/recent [count]` - Show recent games
- `/register <name>` - Register your Discord username to a Wingspan name
- `/mynames` - Show your registered Wingspan names
