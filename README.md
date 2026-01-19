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

All AWS infrastructure is managed via CDK in the `/infra` directory. This creates:

- **DynamoDB** - Games table with GSIs
- **ECR** - Container repositories for app and scorebird
- **VPC** - Public subnet configuration
- **EC2** - t3.small instance with Docker pre-installed
- **Elastic IP** - Static IP for DNS
- **Security Group** - Ports 22, 80, 443
- **IAM** - Roles and users for EC2 and GitHub Actions

### 1. Prerequisites

1. Install AWS CDK CLI:
   ```bash
   npm install -g aws-cdk
   ```

2. Configure AWS credentials:
   ```bash
   aws configure
   ```

3. Create an EC2 Key Pair in the AWS Console:
   - Go to EC2 > Key Pairs > Create Key Pair
   - Name it (e.g., `wingstats-key`)
   - Download the `.pem` file and save it to `~/.ssh/`
   - Set permissions: `chmod 400 ~/.ssh/wingstats-key.pem`

### 2. Deploy Infrastructure

```bash
cd infra
npm install

# Deploy with your key pair name and domain
npx cdk deploy -c keyPairName=wingstats-key -c domainName=wingstats.beatty.codes
```

CDK will output:
- `InstancePublicIP` - Use this for your DNS A record
- `SSHCommand` - Command to SSH into the instance
- `AppRepositoryUri` - ECR URI for the app image
- `ScorebirdRepositoryUri` - ECR URI for scorebird image
- `DeployUserName` - IAM user for GitHub Actions

### 3. Configure DNS

Point your domain's A record to the `InstancePublicIP` from the CDK output.

### 4. Create IAM Access Keys

Create access keys for the `wingstats-deploy` user:

```bash
aws iam create-access-key --user-name wingstats-deploy
```

Save the `AccessKeyId` and `SecretAccessKey` for GitHub secrets.

### 5. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret | Description | Source |
|--------|-------------|--------|
| `AWS_ACCESS_KEY_ID` | Deploy user access key | Step 4 output |
| `AWS_SECRET_ACCESS_KEY` | Deploy user secret key | Step 4 output |
| `EC2_HOST` | EC2 Elastic IP | CDK `InstancePublicIP` output |
| `EC2_USER` | SSH username | `ec2-user` |
| `EC2_SSH_KEY` | Private SSH key contents | Contents of `~/.ssh/wingstats-key.pem` |
| `DOMAIN` | Your domain name | `wingstats.beatty.codes` |
| `DISCORD_BOT_TOKEN` | Discord bot token | Discord Developer Portal |

### 6. First Deployment

The EC2 instance is pre-configured with Docker, docker-compose, and all config files. For the first deploy:

1. SSH into the instance:
   ```bash
   ssh -i ~/.ssh/wingstats-key.pem ec2-user@<instance-ip>
   ```

2. The GitHub Actions workflow will handle subsequent deployments automatically when you push to `main`.

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

### CDK Commands

```bash
cd infra

# Preview changes
npx cdk diff -c keyPairName=wingstats-key

# Deploy
npx cdk deploy -c keyPairName=wingstats-key -c domainName=wingstats.beatty.codes

# Destroy all resources (careful!)
npx cdk destroy -c keyPairName=wingstats-key
```

## Discord Bot Commands

- **@WingStats + image** - Parse a Wingspan scorecard and record the game
- `/stats <player>` - Get stats for a player
- `/leaderboard` - Show top 10 players
- `/recent [count]` - Show recent games
- `/register <name>` - Register your Discord username to a Wingspan name
- `/mynames` - Show your registered Wingspan names

## Cost Estimates

Monthly AWS costs (us-east-1):

| Resource | Estimated Cost |
|----------|---------------|
| EC2 t3.small | ~$15/month |
| Elastic IP | Free (when attached) |
| DynamoDB | ~$0 (pay per request) |
| ECR | ~$1 (storage) |
| **Total** | **~$16/month** |
