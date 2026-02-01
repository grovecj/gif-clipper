package me.cartergrove.gifclipper.service

import me.cartergrove.gifclipper.config.SpacesProperties
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.io.InputStream

@Service
class StorageService(
    private val s3Client: S3Client,
    private val spacesProperties: SpacesProperties
) {
    private val logger = LoggerFactory.getLogger(StorageService::class.java)

    /**
     * Upload a file to Spaces
     * @param key The storage key (path) for the file
     * @param content The file content as InputStream
     * @param contentType The MIME type of the file
     * @param contentLength The size of the file in bytes
     * @return The public URL of the uploaded file
     */
    fun upload(
        key: String,
        content: InputStream,
        contentType: String,
        contentLength: Long
    ): String {
        logger.info("Uploading file to Spaces: bucket=${spacesProperties.bucket}, key=$key")

        val request = PutObjectRequest.builder()
            .bucket(spacesProperties.bucket)
            .key(key)
            .contentType(contentType)
            .acl("public-read")
            .build()

        s3Client.putObject(request, RequestBody.fromInputStream(content, contentLength))

        val url = getCdnUrl(key)
        logger.info("File uploaded successfully: $url")
        return url
    }

    /**
     * Get the CDN URL for a file
     */
    fun getCdnUrl(key: String): String {
        return if (!spacesProperties.cdnUrl.isNullOrBlank()) {
            "${spacesProperties.cdnUrl.trimEnd('/')}/$key"
        } else {
            // Fallback to direct Spaces URL
            "${spacesProperties.endpoint.replace("https://", "https://${spacesProperties.bucket}.")}/$key"
        }
    }

    /**
     * Delete a file from Spaces
     */
    fun delete(key: String) {
        logger.info("Deleting file from Spaces: bucket=${spacesProperties.bucket}, key=$key")

        val request = DeleteObjectRequest.builder()
            .bucket(spacesProperties.bucket)
            .key(key)
            .build()

        s3Client.deleteObject(request)
        logger.info("File deleted successfully: $key")
    }

    /**
     * Check if a file exists
     */
    fun exists(key: String): Boolean {
        return try {
            val request = GetObjectRequest.builder()
                .bucket(spacesProperties.bucket)
                .key(key)
                .build()
            s3Client.getObject(request).use { true }
        } catch (e: Exception) {
            false
        }
    }
}
