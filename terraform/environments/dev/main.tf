terraform {
  required_version = ">= 1.5.0"
  required_providers { aws = { source = "hashicorp/aws"; version = "~> 5.0" } }
  backend "s3" {
    bucket         = "shopwave-tf-state"   # CHANGE ME
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = { Project = var.project, Env = var.env, ManagedBy = "Terraform" } }
}

data "aws_availability_zones" "available" {}

module "vpc" {
  source  = "../../modules/vpc"
  project = var.project
  env     = var.env
  vpc_cidr= var.vpc_cidr
  azs     = slice(data.aws_availability_zones.available.names, 0, 2)
}

module "ecr" {
  source        = "../../modules/ecr"
  project       = var.project
  service_names = ["auth-service","product-service","order-service","payment-service","notification-service","frontend","api-gateway"]
}

module "eks" {
  source             = "../../modules/eks"
  project            = var.project
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  node_types         = var.node_types
  node_desired       = var.node_desired
  node_max           = var.node_max
  node_min           = var.node_min
}

output "cluster_name" { value = module.eks.cluster_name }
output "ecr_urls"     { value = module.ecr.ecr_urls }

variable "project"      { type = string; default = "shopwave" }
variable "env"          { type = string; default = "dev" }
variable "aws_region"   { type = string; default = "us-east-1" }
variable "vpc_cidr"     { type = string; default = "10.0.0.0/16" }
variable "node_types"   { type = list(string); default = ["t3.medium"] }
variable "node_desired" { type = number; default = 2 }
variable "node_max"     { type = number; default = 5 }
variable "node_min"     { type = number; default = 1 }
