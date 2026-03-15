Each student's microservice must demonstrate at least one working integration point with
another group member's service during the demonstration.
SLIIT | DEPARTMENT OF COMPUTER SCIENCE & SOFTWARE ENGINEERING | FACULTY OF
COMPUTING
Module - Current Trendsin Software Engineering (SE4010) | 2026 | Semester 1
Cloud Computing Assignment
Objective:
Design and implement a prototype of a secure, microservice-based application component
using fundamental DevOps practices and cloud capabilities.
Assignment Overview:
Your group (4 students) will design and build a single cohesive application broken down into
four microservices, one per student. Each microservices must be independently deployable
on a public cloud provider, and all four services must integrate and communicate with each
other to form a working end-to-end application. Every microservice must communicate with
at least one other service in the group. The final deliverable should demonstrate basic
DevOps practices, and security considerations including DevSecOps practices, and cloud
capabilities.
Shared Architecture Diagram
The group must produce a single high-level architecture diagram showing all four
microservices, their deployment on the cloud, the communication paths between them, and
any shared infrastructure (API Gateway, message broker, shared database, etc.). This
diagram must be included in report.
Specific Tasks:
Design a Simple Microservice (LO1, LO3)
• Choose a core component of a larger application idea (e.g., user authentication,
product catalog for e-commerce, etc.).
• Outline the functionality and endpoints of this microservice.
• You can choose any programming language/framework of your choice.
Implement Basic DevOps Practices(LO1, LO2)
• The code should be hosted in the version controlling system. Make sure it’s a public
repository.
• Use CI/CD pipelines to automate the build and deployment process for the
microservice.
Containerize the Microservice using Docker (LO3, LO4)
• Your microservice should be containerized.
• Use any existing container registry service to host your container image. The
application deployment should consume the container image from the container
registry.
Deploy the Microservice (LO2, LO4)
• Use managed container orchestration services provided by your cloud service provider
to deploy the containerized microservice.
o You can use cloud specific serviceslike ECS (Elastic Container Service)/ Azure
Container Apps etc..
o You have the freedom to even use managed Kubernetes services provided by
your chosen cloud service provider.
• Ensure the microservice is accessible over the internet.
• Ensure that you can showcase how you have secured your application.
Integrate Basic Security Measures(LO2, LO4)
• Implement basic security best practices(like using IAM roles, security groups etc,,).
• Ensure the microservice handles data securely and follows principles of least privilege.
• Integrate managed SAST toolslike SonarCloud or Snyk to enable DevSecOps practices
to your microservice development. Use free versions here.
Deliverables:
Project Report (should only coverfollowing components):
• Shared architecture diagram showing all four microservices, communication flows, and
cloud infrastructure.
• Description and rationale of your assigned microservice and its role in the overall
application.
• Explanation of how your service communicates with other group members' services
(with examples).
• Overview of the DevOps and security practices implemented.
• Any challenges faced (individual and integration-related) and how they were
addressed.
Code Repository:
• Public repository with all source code for your microservice.
• API contract (OpenAPI/Swagger) for your service's endpoints.
• CI/CD pipeline configuration files.
• Dockerfile and any container-related configuration.
• Accessto the version-controlled repository with allsource code.
Demonstration (Limited to 10 minutes):
• A working prototype of the microservice deployed on chosen cloud service provider.
• A live demonstration of inter-service communication (at least one integration
between two members' services).
• A walkthrough of the CI/CD pipeline running and deploying a change.
• An explanation of the security measures implemented.
Assessment Criteria:
First 90% (except report marks) will be covered during the viva sessions.
• Practicality and functionality of the microservice. (10%)
• Effective implementation of basic DevOps practices and cloud computing capabilities.
(30%)
• Inter-service communication (10%)
• Application of security measures in the microservice including DevSecOps practices.
(20%)
• Code quality and adherence to best practices. (20%)
• Clarity of the project report and demonstration. (10%)
Notes:
• Focus on depth rather than breadth; a well-implemented single microservice is more
valuable than several poorly implemented ones.
• Document all design decisions and challenges encountered during the project.
• When using cloud service providerservices always ensure you are within Free Tier.