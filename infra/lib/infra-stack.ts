import * as cdk from 'aws-cdk-lib/core';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface InfraStackProps extends cdk.StackProps {
  /**
   * Name of an existing EC2 Key Pair for SSH access (optional).
   * Create one in the AWS Console: EC2 > Key Pairs > Create Key Pair
   * If not provided, use SSM Session Manager to access the instance.
   */
  keyPairName?: string;

  /**
   * Your domain name for the app (used in outputs)
   */
  domainName?: string;
}

export class InfraStack extends cdk.Stack {
  public readonly gamesTable: dynamodb.Table;
  public readonly appRepository: ecr.Repository;
  public readonly scorebirdRepository: ecr.Repository;
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // ============================================
    // DynamoDB Tables
    // ============================================

    // Games Table - stores games and player scores
    // PK: GAME#<gameId>, SK: METADATA | PLAYER#<position>
    this.gamesTable = new dynamodb.Table(this, 'GamesTable', {
      tableName: 'wingstats-games',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying games by date (for recent games list)
    this.gamesTable.addGlobalSecondaryIndex({
      indexName: 'GSI1-ByDate',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'playedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying games by player
    this.gamesTable.addGlobalSecondaryIndex({
      indexName: 'GSI2-ByPlayer',
      partitionKey: { name: 'playerName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'playedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================
    // ECR Repositories
    // ============================================

    this.appRepository = new ecr.Repository(this, 'AppRepository', {
      repositoryName: 'wingstats',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: 'Keep only 10 images',
        },
      ],
    });

    this.scorebirdRepository = new ecr.Repository(this, 'ScorebirdRepository', {
      repositoryName: 'wingstats-scorebird',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: 'Keep only 10 images',
        },
      ],
    });

    // ============================================
    // VPC
    // ============================================

    const vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: 'wingstats-vpc',
      maxAzs: 2,
      natGateways: 0, // No NAT gateway to save costs
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // ============================================
    // Security Group
    // ============================================

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      securityGroupName: 'wingstats-sg',
      description: 'Security group for WingStats EC2 instance',
      allowAllOutbound: true,
    });

    // SSH access
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'SSH access'
    );

    // HTTP access
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP access'
    );

    // HTTPS access
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS access'
    );

    // ============================================
    // IAM Role for EC2
    // ============================================

    const ec2Role = new iam.Role(this, 'EC2Role', {
      roleName: 'wingstats-ec2-role',
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for WingStats EC2 instance',
    });

    // Grant ECR pull access
    this.appRepository.grantPull(ec2Role);
    this.scorebirdRepository.grantPull(ec2Role);

    // Grant DynamoDB access
    this.gamesTable.grantReadWriteData(ec2Role);

    // Grant ECR authorization token
    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ecr:GetAuthorizationToken'],
      resources: ['*'],
    }));

    // ============================================
    // EC2 Instance
    // ============================================

    // User data script to set up the instance
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      '',
      '# Update system',
      'yum update -y',
      '',
      '# Install Docker',
      'yum install -y docker',
      'systemctl enable docker',
      'systemctl start docker',
      'usermod -aG docker ec2-user',
      '',
      '# Install Docker Compose',
      'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
      'chmod +x /usr/local/bin/docker-compose',
      'ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose',
      '',
      '# Create app directory',
      'mkdir -p /home/ec2-user/wingstats',
      'chown ec2-user:ec2-user /home/ec2-user/wingstats',
      '',
      '# Create docker-compose.yml',
      'cat > /home/ec2-user/wingstats/docker-compose.yml << \'EOFCOMPOSE\'',
      'services:',
      '  app:',
      '    image: ${ECR_IMAGE}',
      '    container_name: wingstats-app',
      '    restart: unless-stopped',
      '    environment:',
      '      - NODE_ENV=production',
      '      - AWS_REGION=${AWS_REGION:-us-east-1}',
      '      - SCOREBIRD_URL=http://scorebird:8000',
      '    networks:',
      '      - web',
      '    expose:',
      '      - "3000"',
      '    depends_on:',
      '      scorebird:',
      '        condition: service_healthy',
      '',
      '  scorebird:',
      '    image: ${ECR_SCOREBIRD_IMAGE:-wingstats-scorebird:latest}',
      '    container_name: wingstats-scorebird',
      '    restart: unless-stopped',
      '    environment:',
      '      - PYTHONUNBUFFERED=1',
      '    volumes:',
      '      - ./players.json:/app/ScoreBird/signups/players.json',
      '    healthcheck:',
      '      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]',
      '      interval: 30s',
      '      timeout: 10s',
      '      retries: 3',
      '    networks:',
      '      - web',
      '',
      '  discord-bot:',
      '    image: ${ECR_SCOREBIRD_IMAGE:-wingstats-scorebird:latest}',
      '    container_name: wingstats-discord-bot',
      '    command: ["python", "discord_bot.py"]',
      '    restart: unless-stopped',
      '    environment:',
      '      - PYTHONUNBUFFERED=1',
      '      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}',
      '      - API_BASE_URL=http://app:3000/api',
      '      - SCOREBIRD_URL=http://scorebird:8000',
      '      - PLAYERS_JSON_PATH=/app/ScoreBird/signups/players.json',
      '      - SITE_BASE_URL=https://${DOMAIN}',
      '    volumes:',
      '      - ./players.json:/app/ScoreBird/signups/players.json',
      '    depends_on:',
      '      scorebird:',
      '        condition: service_healthy',
      '      app:',
      '        condition: service_started',
      '    networks:',
      '      - web',
      '',
      '  caddy:',
      '    image: caddy:2-alpine',
      '    container_name: wingstats-caddy',
      '    restart: unless-stopped',
      '    ports:',
      '      - "80:80"',
      '      - "443:443"',
      '    volumes:',
      '      - ./Caddyfile:/etc/caddy/Caddyfile:ro',
      '      - caddy_data:/data',
      '      - caddy_config:/config',
      '    networks:',
      '      - web',
      '    depends_on:',
      '      - app',
      '',
      'networks:',
      '  web:',
      '    driver: bridge',
      '',
      'volumes:',
      '  caddy_data:',
      '  caddy_config:',
      'EOFCOMPOSE',
      '',
      '# Create Caddyfile',
      'cat > /home/ec2-user/wingstats/Caddyfile << \'EOFCADDY\'',
      '{$DOMAIN} {',
      '    reverse_proxy app:3000',
      '    encode gzip',
      '',
      '    header {',
      '        X-Content-Type-Options nosniff',
      '        X-Frame-Options DENY',
      '        Referrer-Policy strict-origin-when-cross-origin',
      '    }',
      '}',
      'EOFCADDY',
      '',
      '# Create empty players.json',
      'echo "{}" > /home/ec2-user/wingstats/players.json',
      '',
      '# Create .env template',
      'cat > /home/ec2-user/wingstats/.env.template << \'EOFENV\'',
      '# Fill in these values and rename to .env',
      'ECR_IMAGE=<account-id>.dkr.ecr.us-east-1.amazonaws.com/wingstats:latest',
      'ECR_SCOREBIRD_IMAGE=<account-id>.dkr.ecr.us-east-1.amazonaws.com/wingstats-scorebird:latest',
      'AWS_REGION=us-east-1',
      'DOMAIN=wingstats.beatty.codes',
      'DISCORD_BOT_TOKEN=your-discord-bot-token',
      'EOFENV',
      '',
      '# Set ownership',
      'chown -R ec2-user:ec2-user /home/ec2-user/wingstats',
      '',
      'echo "Setup complete! SSH in and configure /home/ec2-user/wingstats/.env"',
    );

    // Look up the key pair if provided
    const keyPair = props.keyPairName
      ? ec2.KeyPair.fromKeyPairName(this, 'KeyPair', props.keyPairName)
      : undefined;

    this.instance = new ec2.Instance(this, 'Instance', {
      instanceName: 'wingstats',
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      role: ec2Role,
      keyPair,
      userData,
      ssmSessionPermissions: true, // Enable SSM Session Manager access
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });

    // Allocate Elastic IP for stable public IP
    const eip = new ec2.CfnEIP(this, 'ElasticIP', {
      domain: 'vpc',
      tags: [{ key: 'Name', value: 'wingstats-eip' }],
    });

    new ec2.CfnEIPAssociation(this, 'EIPAssociation', {
      eip: eip.ref,
      instanceId: this.instance.instanceId,
    });

    // ============================================
    // IAM User for GitHub Actions
    // ============================================

    const deployUser = new iam.User(this, 'DeployUser', {
      userName: 'wingstats-deploy',
    });

    // Grant ECR push access
    this.appRepository.grantPullPush(deployUser);
    this.scorebirdRepository.grantPullPush(deployUser);

    // Grant ECR authorization token
    deployUser.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ecr:GetAuthorizationToken'],
      resources: ['*'],
    }));

    // ============================================
    // IAM User for local development
    // ============================================

    const devUser = new iam.User(this, 'DevUser', {
      userName: 'wingstats-dev',
    });

    // Grant permissions to the dev user
    this.gamesTable.grantReadWriteData(devUser);

    // ============================================
    // Outputs
    // ============================================

    new cdk.CfnOutput(this, 'GamesTableName', {
      value: this.gamesTable.tableName,
      description: 'DynamoDB Games Table Name',
    });

    new cdk.CfnOutput(this, 'AppRepositoryUri', {
      value: this.appRepository.repositoryUri,
      description: 'ECR Repository URI for the app',
    });

    new cdk.CfnOutput(this, 'ScorebirdRepositoryUri', {
      value: this.scorebirdRepository.repositoryUri,
      description: 'ECR Repository URI for ScoreBird',
    });

    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
      description: 'EC2 Instance ID',
    });

    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: eip.attrPublicIp,
      description: 'EC2 Elastic IP (use this for DNS)',
    });

    if (props.keyPairName) {
      new cdk.CfnOutput(this, 'SSHCommand', {
        value: `ssh -i ~/.ssh/${props.keyPairName}.pem ec2-user@${eip.attrPublicIp}`,
        description: 'SSH command to connect to the instance',
      });
    } else {
      new cdk.CfnOutput(this, 'SSMCommand', {
        value: `aws ssm start-session --target ${this.instance.instanceId}`,
        description: 'SSM Session Manager command to connect to the instance',
      });
    }

    new cdk.CfnOutput(this, 'DeployUserName', {
      value: deployUser.userName,
      description: 'IAM user for GitHub Actions deployments',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });

    if (props.domainName) {
      new cdk.CfnOutput(this, 'DomainSetup', {
        value: `Point ${props.domainName} A record to ${eip.attrPublicIp}`,
        description: 'DNS configuration reminder',
      });
    }
  }
}
