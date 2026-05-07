data "aws_iam_policy_document" "cluster_assume" {
  statement { actions = ["sts:AssumeRole"]; principals { type = "Service"; identifiers = ["eks.amazonaws.com"] } }
}
data "aws_iam_policy_document" "node_assume" {
  statement { actions = ["sts:AssumeRole"]; principals { type = "Service"; identifiers = ["ec2.amazonaws.com"] } }
}

resource "aws_iam_role" "cluster" { name = "${var.project}-eks-cluster"; assume_role_policy = data.aws_iam_policy_document.cluster_assume.json }
resource "aws_iam_role" "nodes"   { name = "${var.project}-eks-nodes";   assume_role_policy = data.aws_iam_policy_document.node_assume.json }

resource "aws_iam_role_policy_attachment" "cluster" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}
resource "aws_iam_role_policy_attachment" "node" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  ])
  policy_arn = each.value
  role       = aws_iam_role.nodes.name
}

resource "aws_eks_cluster" "main" {
  name     = "${var.project}-eks"
  role_arn = aws_iam_role.cluster.arn
  version  = var.k8s_version
  vpc_config {
    subnet_ids              = concat(var.public_subnet_ids, var.private_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = true
  }
  depends_on = [aws_iam_role_policy_attachment.cluster]
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project}-nodes"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = var.node_types
  scaling_config  { desired_size = var.node_desired; max_size = var.node_max; min_size = var.node_min }
  update_config   { max_unavailable = 1 }
  depends_on      = [aws_iam_role_policy_attachment.node]
}

output "cluster_name"     { value = aws_eks_cluster.main.name }
output "cluster_endpoint" { value = aws_eks_cluster.main.endpoint }

variable "project"            { type = string }
variable "k8s_version"        { type = string; default = "1.29" }
variable "public_subnet_ids"  { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "node_types"         { type = list(string); default = ["t3.medium"] }
variable "node_desired"       { type = number; default = 2 }
variable "node_max"           { type = number; default = 5 }
variable "node_min"           { type = number; default = 1 }
