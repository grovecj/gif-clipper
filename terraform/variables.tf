# =============================================================================
# Provider Credentials
# =============================================================================

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "do_spaces_access_id" {
  description = "DigitalOcean Spaces access key ID"
  type        = string
  sensitive   = true
}

variable "do_spaces_secret_key" {
  description = "DigitalOcean Spaces secret access key"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token with repo permissions"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub repository owner (username or org)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "gif-clipper"
}

variable "github_branch" {
  description = "GitHub branch to deploy from"
  type        = string
  default     = "main"
}

# =============================================================================
# Shared Resources
# =============================================================================

variable "shared_db_cluster_name" {
  description = "Name of the shared PostgreSQL cluster (from mlb-stats)"
  type        = string
  default     = "mlb-stats-db"
}

variable "base_domain" {
  description = "Base domain for DNS records (e.g., cartergrove.me)"
  type        = string
}

# =============================================================================
# Application Configuration
# =============================================================================

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "gif-clipper"
}

variable "region" {
  description = "DigitalOcean App Platform region"
  type        = string
  default     = "nyc"
}

variable "instance_size" {
  description = "App Platform instance size"
  type        = string
  default     = "basic-xxs" # $5/month, 512MB RAM
}

variable "instance_count" {
  description = "Number of app instances"
  type        = number
  default     = 1
}

# =============================================================================
# Spaces (Object Storage) Configuration
# =============================================================================

variable "spaces_bucket_name" {
  description = "Name of the Spaces bucket for GIF storage"
  type        = string
  default     = "gif-clipper-storage"
}

variable "spaces_region" {
  description = "DigitalOcean Spaces region"
  type        = string
  default     = "nyc3"
}

variable "gif_retention_days" {
  description = "Number of days to retain GIFs (0 for indefinite)"
  type        = number
  default     = 365
}

# =============================================================================
# Custom Domains
# =============================================================================

variable "api_custom_domain" {
  description = "Custom domain for API (e.g., gif-api.cartergrove.me)"
  type        = string
  default     = ""
}

variable "cdn_custom_domain" {
  description = "Custom domain for CDN/GIF hosting (e.g., gif.cartergrove.me)"
  type        = string
  default     = ""
}

variable "cdn_certificate_name" {
  description = "Name of SSL certificate for CDN custom domain"
  type        = string
  default     = ""
}
