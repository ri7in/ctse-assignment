import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class TaskyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC with public and private subnets
    const vpc = new ec2.Vpc(this, 'TaskyVpc', {
      maxAzs: 2,
      natGateways: 0, // Free tier - no NAT gateway
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Private subnets without NAT
          cidrMask: 24,
        },
      ],
    });

    // Security group for ECS tasks
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'TaskyEcsSecurityGroup', {
      vpc,
      description: 'Security group for Tasky ECS tasks',
    });

    // Allow inbound traffic from ALB
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3000),
      'Allow traffic from ALB to auth service'
    );
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3001),
      'Allow traffic from ALB to user service'
    );
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3002),
      'Allow traffic from ALB to project service'
    );
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3003),
      'Allow traffic from ALB to task service'
    );
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3004),
      'Allow traffic from ALB to tracker service'
    );
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3005),
      'Allow traffic from ALB to inbox service'
    );
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(80),
      'Allow traffic from ALB to frontend'
    );

    // DocumentDB (MongoDB compatible) - Free tier eligible
    const documentDbSecurityGroup = new ec2.SecurityGroup(this, 'TaskyDocDbSecurityGroup', {
      vpc,
      description: 'Security group for Tasky DocumentDB',
    });

    documentDbSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(27017),
      'Allow ECS tasks to access DocumentDB'
    );

    const documentDb = new docdb.DatabaseCluster(this, 'TaskyDocumentDb', {
      masterUser: {
        username: 'taskyadmin',
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // Free tier
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroup: documentDbSecurityGroup,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'TaskyCluster', {
      vpc,
    });

    // ECR Repositories
    const services = ['auth-service', 'user-service', 'project-service', 'task-service', 'tracker-service', 'inbox-service', 'frontend'];
    const repositories: { [key: string]: ecr.Repository } = {};

    services.forEach(service => {
      repositories[service] = new ecr.Repository(this, `${service}Repo`, {
        repositoryName: `tasky/${service}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    });

    // JWT Secret
    const jwtSecret = new secretsmanager.Secret(this, 'TaskyJwtSecret', {
      secretName: 'tasky/jwt-secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'secret',
        passwordLength: 32,
      },
    });

    // Application Load Balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'TaskyLoadBalancer', {
      vpc,
      internetFacing: true,
    });

    // Create HTTP listener for path-based routing
    const listener = loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    // Create ECS services with ALB integration
    const serviceConfigs = [
      { name: 'auth-service', port: 3000, path: '/api/auth/*' },
      { name: 'user-service', port: 3001, path: '/api/users/*' },
      { name: 'project-service', port: 3002, path: '/api/projects/*' },
      { name: 'task-service', port: 3003, path: '/api/tasks/*' },
      { name: 'tracker-service', port: 3004, path: '/api/tracker/*' },
      { name: 'inbox-service', port: 3005, path: '/api/inbox/*' },
      { name: 'frontend', port: 80, path: '/*' },
    ];

    serviceConfigs.forEach(config => {
      const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `${config.name}Service`, {
        cluster,
        serviceName: config.name,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(repositories[config.name]),
          containerPort: config.port,
          environment: {
            NODE_ENV: 'production',
            MONGODB_HOST: documentDb.clusterEndpoint.hostname,
            MONGODB_PORT: documentDb.clusterEndpoint.port.toString(),
            MONGODB_USERNAME: 'taskyadmin',
            JWT_SECRET_ARN: jwtSecret.secretArn,
            // Kafka not included in free tier - services will work without it
            KAFKA_BROKER: '',
            KAFKA_CLIENT_ID: config.name,
            KAFKA_GROUP_ID: `tasky-${config.name.replace('-service', '')}-group`,
          },
          secrets: {
            MONGODB_PASSWORD: ecs.Secret.fromSecretsManager(documentDb.secret!, 'password'),
            JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, 'secret'),
          },
        },
        publicLoadBalancer: false, // We'll use a shared ALB
        desiredCount: 1,
        cpu: 256, // 0.25 vCPU - Free tier eligible
        memoryLimitMiB: 512, // 512 MB - Free tier eligible
        securityGroups: [ecsSecurityGroup],
        assignPublicIp: true, // Need public IP to pull from ECR
        taskSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Place in public subnets
      });

      // Add target group to the shared listener
      listener.addTargets(`${config.name}TargetGroup`, {
        targetGroupName: `${config.name}-tg`,
        port: config.port,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targets: [service.service],
        conditions: [
          elbv2.ListenerCondition.pathPatterns([config.path]),
        ],
        priority: serviceConfigs.indexOf(config) + 1, // Priority based on order
        healthCheck: {
          path: '/health',
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 2,
        },
      });
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS Name',
    });

    new cdk.CfnOutput(this, 'DocumentDBEndpoint', {
      value: documentDb.clusterEndpoint.hostname,
      description: 'DocumentDB Cluster Endpoint',
    });

    new cdk.CfnOutput(this, 'ECRRepositories', {
      value: services.map(s => repositories[s].repositoryUri).join(', '),
      description: 'ECR Repository URIs',
    });
  }
}