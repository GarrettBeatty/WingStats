#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

// Get configuration from context or environment (all optional)
const keyPairName = app.node.tryGetContext('keyPairName') || process.env.KEY_PAIR_NAME;
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME;

new InfraStack(app, 'InfraStack', {
  keyPairName,
  domainName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
