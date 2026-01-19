import * as cdk from 'aws-cdk-lib/core';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class InfraStack extends cdk.Stack {
  public readonly gamesTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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

    // Users Table - stores user profiles and stats
    // PK: USER#<userId>, SK: PROFILE
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'wingstats-users',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for looking up users by Discord ID
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'GSI1-ByDiscordId',
      partitionKey: { name: 'discordId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for leaderboard queries (by average score)
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'GSI2-Leaderboard',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'averageScore', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================
    // IAM User for local development
    // ============================================

    const devUser = new iam.User(this, 'DevUser', {
      userName: 'wingstats-dev',
    });

    // Grant permissions to the dev user
    this.gamesTable.grantReadWriteData(devUser);
    this.usersTable.grantReadWriteData(devUser);

    // ============================================
    // Outputs
    // ============================================

    new cdk.CfnOutput(this, 'GamesTableName', {
      value: this.gamesTable.tableName,
      description: 'DynamoDB Games Table Name',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'DynamoDB Users Table Name',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });
  }
}
