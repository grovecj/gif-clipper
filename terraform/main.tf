terraform {
  required_version = ">= 1.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.34"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "digitalocean" {
  token             = var.do_token
  spaces_access_id  = var.do_spaces_access_id
  spaces_secret_key = var.do_spaces_secret_key
}

provider "github" {
  token = var.github_token
  owner = var.github_owner
}

# =============================================================================
# Shared Database (reference existing mlb-stats cluster)
# =============================================================================

data "digitalocean_database_cluster" "shared_postgres" {
  name = var.shared_db_cluster_name
}

# Create a separate database for gif-clipper on the shared cluster
resource "digitalocean_database_db" "gif_clipper" {
  cluster_id = data.digitalocean_database_cluster.shared_postgres.id
  name       = "gif_clipper"
}

# Create a dedicated user for gif-clipper
resource "digitalocean_database_user" "gif_clipper" {
  cluster_id = data.digitalocean_database_cluster.shared_postgres.id
  name       = "gif_clipper_user"
}

# =============================================================================
# Spaces Bucket for GIF Storage
# =============================================================================

resource "digitalocean_spaces_bucket" "gifs" {
  name   = var.spaces_bucket_name
  region = var.spaces_region
  acl    = "public-read"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    enabled = true

    # Optional: expire old GIFs after a certain period
    expiration {
      days = var.gif_retention_days
    }
  }
}

# CDN for the Spaces bucket
resource "digitalocean_cdn" "gifs" {
  origin           = digitalocean_spaces_bucket.gifs.bucket_domain_name
  custom_domain    = var.cdn_custom_domain != "" ? var.cdn_custom_domain : null
  certificate_name = var.cdn_custom_domain != "" ? var.cdn_certificate_name : null
  ttl              = 3600
}

# =============================================================================
# App Platform - Backend API
# =============================================================================

resource "digitalocean_app" "gif_clipper" {
  spec {
    name   = var.app_name
    region = var.region

    # Custom domain
    dynamic "domain" {
      for_each = var.api_custom_domain != "" ? [var.api_custom_domain] : []
      content {
        name = domain.value
        type = "PRIMARY"
      }
    }

    alert {
      rule = "DEPLOYMENT_FAILED"
    }

    service {
      name               = "api"
      instance_count     = var.instance_count
      instance_size_slug = var.instance_size
      http_port          = 8080

      github {
        repo           = "${var.github_owner}/${var.github_repo}"
        branch         = var.github_branch
        deploy_on_push = true
      }

      dockerfile_path = "backend/Dockerfile"

      health_check {
        http_path             = "/actuator/health"
        initial_delay_seconds = 60
        period_seconds        = 30
        timeout_seconds       = 10
        failure_threshold     = 3
      }

      # Database connection
      env {
        key   = "DATABASE_URL"
        value = "jdbc:postgresql://${data.digitalocean_database_cluster.shared_postgres.host}:${data.digitalocean_database_cluster.shared_postgres.port}/${digitalocean_database_db.gif_clipper.name}?sslmode=require"
        type  = "GENERAL"
      }

      env {
        key   = "DATABASE_USERNAME"
        value = digitalocean_database_user.gif_clipper.name
        type  = "GENERAL"
      }

      env {
        key   = "DATABASE_PASSWORD"
        value = digitalocean_database_user.gif_clipper.password
        type  = "SECRET"
      }

      # Spaces configuration
      env {
        key   = "DO_SPACES_ENDPOINT"
        value = "https://${var.spaces_region}.digitaloceanspaces.com"
        type  = "GENERAL"
      }

      env {
        key   = "DO_SPACES_BUCKET"
        value = digitalocean_spaces_bucket.gifs.name
        type  = "GENERAL"
      }

      env {
        key   = "DO_SPACES_ACCESS_KEY"
        value = var.do_spaces_access_id
        type  = "SECRET"
      }

      env {
        key   = "DO_SPACES_SECRET_KEY"
        value = var.do_spaces_secret_key
        type  = "SECRET"
      }

      env {
        key   = "GIF_CDN_URL"
        value = var.cdn_custom_domain != "" ? "https://${var.cdn_custom_domain}" : "https://${digitalocean_cdn.gifs.endpoint}"
        type  = "GENERAL"
      }

      env {
        key   = "JAVA_OPTS"
        value = "-Xmx512m"
        type  = "GENERAL"
      }

      env {
        key   = "ENVIRONMENT"
        value = "production"
        type  = "GENERAL"
      }
    }
  }
}

# Update database firewall to allow gif-clipper app
resource "digitalocean_database_firewall" "gif_clipper" {
  cluster_id = data.digitalocean_database_cluster.shared_postgres.id

  # Note: This will need to coexist with mlb-stats firewall rules
  # Consider managing all firewall rules in one place
  rule {
    type  = "app"
    value = digitalocean_app.gif_clipper.id
  }
}

# DNS Record for API custom domain
resource "digitalocean_record" "api_cname" {
  count  = var.api_custom_domain != "" ? 1 : 0
  domain = var.base_domain
  type   = "CNAME"
  name   = split(".", var.api_custom_domain)[0]
  value  = "${replace(digitalocean_app.gif_clipper.default_ingress, "https://", "")}."
  ttl    = 3600
}

# DNS Record for CDN custom domain
resource "digitalocean_record" "cdn_cname" {
  count  = var.cdn_custom_domain != "" ? 1 : 0
  domain = var.base_domain
  type   = "CNAME"
  name   = split(".", var.cdn_custom_domain)[0]
  value  = "${digitalocean_cdn.gifs.endpoint}."
  ttl    = 3600
}

# =============================================================================
# GitHub Repository Configuration
# =============================================================================

# Import existing repository (already created via gh cli)
import {
  to = github_repository.gif_clipper
  id = var.github_repo
}

resource "github_repository" "gif_clipper" {
  name        = var.github_repo
  description = "Cross-platform screen capture to GIF application"
  visibility  = "public"

  has_issues   = true
  has_projects = true
  has_wiki     = false

  delete_branch_on_merge = true
  vulnerability_alerts   = true
}

resource "github_repository_dependabot_security_updates" "gif_clipper" {
  repository = github_repository.gif_clipper.name
  enabled    = true
}

# Issue labels for project management
resource "github_issue_label" "labels" {
  for_each = {
    "desktop-app"  = { color = "1d76db", description = "Electron desktop application" }
    "backend"      = { color = "0e8a16", description = "Spring Boot backend API" }
    "terraform"    = { color = "5319e7", description = "Infrastructure as code" }
    "enhancement"  = { color = "a2eeef", description = "New feature or request" }
    "bug"          = { color = "d73a4a", description = "Something isn't working" }
    "documentation"= { color = "0075ca", description = "Improvements or additions to documentation" }
    "good first issue" = { color = "7057ff", description = "Good for newcomers" }
    "priority:high"    = { color = "b60205", description = "High priority" }
    "priority:medium"  = { color = "fbca04", description = "Medium priority" }
    "priority:low"     = { color = "c5def5", description = "Low priority" }
  }

  repository  = github_repository.gif_clipper.name
  name        = each.key
  color       = each.value.color
  description = each.value.description
}
