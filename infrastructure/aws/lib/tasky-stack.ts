import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as docdb from "aws-cdk-lib/aws-docdb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";

export class TaskyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC - public subnets only to avoid NAT gateway costs
    const vpc = new ec2.Vpc(this, "TaskyVpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // ALB security group
    const albSecurityGroup = new ec2.SecurityGroup(
      this,
      "TaskyAlbSecurityGroup",
      {
        vpc,
        description: "Security group for Tasky ALB",
      },
    );
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP",
    );

    // ECS security group - only accepts traffic from ALB
    const ecsSecurityGroup = new ec2.SecurityGroup(
      this,
      "TaskyEcsSecurityGroup",
      {
        vpc,
        description: "Security group for Tasky ECS tasks",
      },
    );
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.allTcp(),
      "Allow traffic from ALB",
    );

    // DocumentDB security group
    const docDbSecurityGroup = new ec2.SecurityGroup(
      this,
      "TaskyDocDbSecurityGroup",
      {
        vpc,
        description: "Security group for Tasky DocumentDB",
      },
    );
    docDbSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(27017),
      "Allow ECS tasks to access DocumentDB",
    );

    const documentDb = new docdb.DatabaseCluster(this, "TaskyDocumentDb", {
      masterUser: { username: "taskyadmin" },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: docDbSecurityGroup,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "TaskyCluster", {
      clusterName: "TaskyCluster",
      vpc,
    });

    // ECR Repositories
    const serviceList = [
      "auth-service",
      "user-service",
      "project-service",
      "task-service",
      "tracker-service",
      "inbox-service",
      "frontend",
    ];

    const repositories: { [key: string]: ecr.Repository } = {};
    serviceList.forEach((service) => {
      repositories[service] = new ecr.Repository(this, `${service}Repo`, {
        repositoryName: `tasky/${service}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    });

    // JWT Secret
    const jwtSecret = new secretsmanager.Secret(this, "TaskyJwtSecret", {
      secretName: "tasky/jwt-secret",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "secret",
        passwordLength: 32,
      },
    });

    // Shared Application Load Balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(
      this,
      "TaskyLoadBalancer",
      {
        vpc,
        internetFacing: true,
        securityGroup: albSecurityGroup,
      },
    );

    const listener = loadBalancer.addListener("HttpListener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        messageBody: "Not found",
      }),
    });

    // Service definitions
    const serviceConfigs = [
      { name: "auth-service", port: 3000, path: "/api/auth/*", priority: 1 },
      { name: "user-service", port: 3001, path: "/api/users/*", priority: 2 },
      {
        name: "project-service",
        port: 3002,
        path: "/api/projects/*",
        priority: 3,
      },
      { name: "task-service", port: 3003, path: "/api/tasks/*", priority: 4 },
      {
        name: "tracker-service",
        port: 3004,
        path: "/api/tracker/*",
        priority: 5,
      },
      { name: "inbox-service", port: 3005, path: "/api/inbox/*", priority: 6 },
      { name: "frontend", port: 80, path: "/*", priority: 7 },
    ];

    serviceConfigs.forEach((config) => {
      const taskDef = new ecs.FargateTaskDefinition(
        this,
        `${config.name}TaskDef`,
        {
          cpu: 256,
          memoryLimitMiB: 512,
        },
      );

      taskDef.addContainer(`${config.name}Container`, {
        image: ecs.ContainerImage.fromEcrRepository(repositories[config.name]),
        portMappings: [{ containerPort: config.port }],
        environment: {
          NODE_ENV: "production",
          MONGODB_HOST: documentDb.clusterEndpoint.hostname,
          MONGODB_PORT: documentDb.clusterEndpoint.port.toString(),
          MONGODB_USERNAME: "taskyadmin",
          JWT_SECRET_ARN: jwtSecret.secretArn,
          KAFKA_BROKER: "",
          KAFKA_CLIENT_ID: config.name,
          KAFKA_GROUP_ID: `tasky-${config.name.replace("-service", "")}-group`,
        },
        secrets: {
          MONGODB_PASSWORD: ecs.Secret.fromSecretsManager(
            documentDb.secret!,
            "password",
          ),
          JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, "secret"),
        },
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: config.name }),
      });

      // Grant ECR pull permissions
      repositories[config.name].grantPull(taskDef.executionRole!);

      // Grant Secrets Manager access
      jwtSecret.grantRead(taskDef.taskRole);
      documentDb.secret!.grantRead(taskDef.taskRole);

      const fargateService = new ecs.FargateService(
        this,
        `${config.name}Service`,
        {
          cluster,
          serviceName: config.name,
          taskDefinition: taskDef,
          desiredCount: 1,
          assignPublicIp: true, // Required without NAT gateway
          vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
          securityGroups: [ecsSecurityGroup],
        },
      );

      const targetGroup = new elbv2.ApplicationTargetGroup(
        this,
        `${config.name}TG`,
        {
          vpc,
          targetGroupName: `${config.name}-tg`,
          port: config.port,
          protocol: elbv2.ApplicationProtocol.HTTP,
          targets: [fargateService],
          healthCheck: {
            path: "/health",
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(5),
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 3,
          },
        },
      );

      listener.addTargetGroups(`${config.name}Rule`, {
        targetGroups: [targetGroup],
        conditions: [elbv2.ListenerCondition.pathPatterns([config.path])],
        priority: config.priority,
      });
    });

    // Outputs
    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: loadBalancer.loadBalancerDnsName,
      description: "Application Load Balancer DNS Name",
    });

    new cdk.CfnOutput(this, "DocumentDBEndpoint", {
      value: documentDb.clusterEndpoint.hostname,
      description: "DocumentDB Cluster Endpoint",
    });

    new cdk.CfnOutput(this, "ECRRepositories", {
      value: serviceList.map((s) => repositories[s].repositoryUri).join(", "),
      description: "ECR Repository URIs",
    });
  }
}
