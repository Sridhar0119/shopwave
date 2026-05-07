#!/bin/bash
set -euo pipefail
CLUSTER=${1:-shopwave-eks}
REGION=${2:-us-east-1}
aws eks update-kubeconfig --region $REGION --name $CLUSTER
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl rollout status deploy/argocd-server -n argocd --timeout=180s
kubectl apply -f argocd/applications/project.yaml
kubectl apply -f argocd/applications/app-of-apps.yaml
kubectl patch svc argocd-server -n argocd -p '{"spec":{"type":"LoadBalancer"}}'
sleep 30
HOST=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD: https://$HOST  user: admin  pass: $PASS"
