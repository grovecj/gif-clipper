output "app_url" {
  description = "The URL of the deployed API"
  value       = digitalocean_app.gif_clipper.live_url
}

output "app_id" {
  description = "The ID of the App Platform application"
  value       = digitalocean_app.gif_clipper.id
}

output "spaces_bucket_name" {
  description = "Name of the Spaces bucket"
  value       = digitalocean_spaces_bucket.gifs.name
}

output "spaces_endpoint" {
  description = "Spaces bucket endpoint"
  value       = "https://${digitalocean_spaces_bucket.gifs.bucket_domain_name}"
}

output "cdn_endpoint" {
  description = "CDN endpoint for serving GIFs"
  value       = "https://${digitalocean_cdn.gifs.endpoint}"
}

output "gif_base_url" {
  description = "Base URL for GIF sharing (use with /id/{uniqueId})"
  value       = var.cdn_custom_domain != "" ? "https://${var.cdn_custom_domain}" : "https://${digitalocean_cdn.gifs.endpoint}"
}

output "database_name" {
  description = "Name of the gif-clipper database"
  value       = digitalocean_database_db.gif_clipper.name
}

output "database_user" {
  description = "Database username for gif-clipper"
  value       = digitalocean_database_user.gif_clipper.name
}

output "api_domain_dns" {
  description = "DNS configuration for API custom domain"
  value       = var.api_custom_domain != "" ? "Add CNAME: ${var.api_custom_domain} -> ${replace(digitalocean_app.gif_clipper.default_ingress, "https://", "")}" : "No custom domain configured"
}

output "cdn_domain_dns" {
  description = "DNS configuration for CDN custom domain"
  value       = var.cdn_custom_domain != "" ? "Add CNAME: ${var.cdn_custom_domain} -> ${digitalocean_cdn.gifs.endpoint}" : "No custom domain configured"
}
