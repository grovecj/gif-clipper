package me.cartergrove.gifclipper.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@ConfigurationProperties(prefix = "app")
data class AppProperties(
    val baseUrl: String,
    val gif: GifProperties = GifProperties()
)

data class GifProperties(
    val maxSizeBytes: Long = 52428800, // 50MB default
    val allowedContentTypes: List<String> = listOf("image/gif")
)

@Configuration
@EnableConfigurationProperties(SpacesProperties::class, AppProperties::class)
class AppConfig
