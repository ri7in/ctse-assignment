import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";

export class TaskyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Minimal VPC - public subnets only, no NAT cost
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

    const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSG", {
      vpc,
      description: "ALB security group",
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "HTTP",
    );

    const ecsSG = new ec2.SecurityGroup(this, "EcsSG", {
      vpc,
      description: "ECS security group",
    });
    ecsSG.addIngressRule(albSecurityGroup, ec2.Port.allTcp(), "From ALB");

    // Store MongoDB URI in Secrets Manager
    const mongoSecret = new secretsmanager.Secret(this, "MongoUri", {
      secretName: "tasky/mongodb-uri",
      secretStringValue: cdk.SecretValue.unsafePlainText(
        process.env.MONGODB_URI || "",
      ),
    });

    const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
      secretName: "tasky/jwt-secret",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "secret",
        passwordLength: 32,
      },
    });

    const cluster = new ecs.Cluster(this, "TaskyCluster", {
      clusterName: "TaskyCluster",
      vpc,
    });

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

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    const listener = loadBalancer.addListener("Http", {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        messageBody: "Not found",
      }),
    });

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
      const taskDef = new ecs.FargateTaskDefinition(this, `${config.name}TD`, {
        cpu: 256,
        memoryLimitMiB: 512,
      });

      taskDef.addContainer(`${config.name}C`, {
        image: ecs.ContainerImage.fromEcrRepository(repositories[config.name]),
        portMappings: [{ containerPort: config.port }],
        environment: {
          NODE_ENV: "production",
          KAFKA_BROKER: "",
          KAFKA_CLIENT_ID: config.name,
          KAFKA_GROUP_ID: `tasky-${config.name.replace("-service", "")}-group`,
        },
        secrets: {
          MONGODB_URI: ecs.Secret.fromSecretsManager(mongoSecret),
          JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, "secret"),
        },
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: config.name }),
      });

      repositories[config.name].grantPull(taskDef.executionRole!);
      mongoSecret.grantRead(taskDef.taskRole);
      jwtSecret.grantRead(taskDef.taskRole);

      const fargateService = new ecs.FargateService(this, `${config.name}Svc`, {
        cluster,
        serviceName: config.name,
        taskDefinition: taskDef,
        desiredCount: 1,
        assignPublicIp: true,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        securityGroups: [ecsSG],
      });

      const tg = new elbv2.ApplicationTargetGroup(this, `${config.name}TG`, {
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
      });

      listener.addTargetGroups(`${config.name}Rule`, {
        targetGroups: [tg],
        conditions: [elbv2.ListenerCondition.pathPatterns([config.path])],
        priority: config.priority,
      });
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: loadBalancer.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, "ECRRepositories", {
      value: serviceList.map((s) => repositories[s].repositoryUri).join(", "),
    });
  }
}
