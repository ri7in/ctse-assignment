# deploy-to-azure.ps1
param(
    [string]$ResourceGroup = "tasky-free-rg",
    [string]$Location = "eastus",
    [string]$ClusterName = "tasky-free-aks",
    [string]$MongoDBName = "tasky-free-mongo"
)

# Login to Azure (run this manually first)
# az login

# Set subscription (if you have multiple)
# az account set --subscription "<your-subscription-id>"

Write-Host "Creating resource group..."
az group create --name $ResourceGroup --location $Location

Write-Host "Creating free tier AKS cluster..."
az aks create `
  --resource-group $ResourceGroup `
  --name $ClusterName `
  --node-count 1 `
  --node-vm-size "Standard_B2s" `
  --enable-addons monitoring `
  --generate-ssh-keys `
  --no-wait

Write-Host "Waiting for AKS cluster creation..."
az aks wait --created --resource-group $ResourceGroup --name $ClusterName --timeout 600

Write-Host "Getting AKS credentials..."
az aks get-credentials --resource-group $ResourceGroup --name $ClusterName --overwrite-existing

Write-Host "Installing NGINX Ingress Controller..."
kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f -
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx `
  --namespace ingress-nginx `
  --set controller.replicaCount=1 `
  --set controller.nodeSelector."kubernetes\.io/os"=linux `
  --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux

Write-Host "Waiting for ingress controller..."
kubectl wait --for=condition=available --timeout=300s deployment/nginx-ingress-ingress-nginx-controller -n ingress-nginx

Write-Host "Creating free tier Azure Cosmos DB (MongoDB API)..."
az cosmosdb create `
  --name $MongoDBName `
  --resource-group $ResourceGroup `
  --kind MongoDB `
  --server-version "3.6" `
  --default-consistency-level "Session" `
  --locations regionName=$Location failoverPriority=0 `
  --enable-free-tier true

Write-Host "Getting MongoDB connection string..."
$mongoConnection = az cosmosdb keys list --name $MongoDBName --resource-group $ResourceGroup --type connection-strings --query "connectionStrings[0].connectionString" -o tsv

Write-Host "MongoDB Connection String: $mongoConnection"

# Generate JWT secret
$jwtSecret = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))

Write-Host "Creating secrets.yaml..."
$secretsYaml = @"
apiVersion: v1
kind: Secret
metadata:
  name: tasky-secrets
  namespace: tasky
type: Opaque
data:
  MONGODB_URI_AUTH: $([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($mongoConnection)))
  MONGODB_URI_USERS: $([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($mongoConnection)))
  MONGODB_URI_PROJECTS: $([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($mongoConnection)))
  MONGODB_URI_TASKS: $([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($mongoConnection)))
  MONGODB_URI_TRACKER: $([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($mongoConnection)))
  MONGODB_URI_INBOX: $([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($mongoConnection)))
  JWT_SECRET: $jwtSecret
"@

$secretsYaml | Out-File -FilePath "infrastructure/k8s/secrets.yaml" -Encoding UTF8

Write-Host "Deploying to Kubernetes..."
Set-Location infrastructure/k8s
kubectl apply -k .

Write-Host "Waiting for deployments..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n tasky

Write-Host "Getting service status..."
kubectl get pods -n tasky
kubectl get services -n tasky

Write-Host "Waiting for ingress external IP..."
Start-Sleep -Seconds 30
kubectl get ingress -n tasky

$externalIP = kubectl get ingress tasky-ingress -n tasky -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
if ($externalIP) {
    Write-Host "Your app is available at: http://$externalIP"
} else {
    Write-Host "Ingress is still provisioning. Run 'kubectl get ingress -n tasky' later to get the external IP."
}

Write-Host "Deployment complete!"