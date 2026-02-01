package me.cartergrove.gifclipper.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI

@ConfigurationProperties(prefix = "spaces")
data class SpacesProperties(
    val endpoint: String,
    val bucket: String,
    val accessKey: String,
    val secretKey: String,
    val cdnUrl: String?
)

@Configuration
class SpacesConfig(private val properties: SpacesProperties) {

    @Bean
    fun s3Client(): S3Client {
        val credentials = AwsBasicCredentials.create(properties.accessKey, properties.secretKey)

        return S3Client.builder()
            .endpointOverride(URI.create(properties.endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .region(Region.US_EAST_1) // Region is ignored for Spaces but required by SDK
            .forcePathStyle(false) // Spaces uses virtual-hosted style
            .build()
    }
}
