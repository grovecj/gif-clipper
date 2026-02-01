package me.cartergrove.gifclipper.service

import me.cartergrove.gifclipper.config.AppProperties
import me.cartergrove.gifclipper.domain.gif.Gif
import me.cartergrove.gifclipper.domain.gif.GifRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@Service
class GifService(
    private val gifRepository: GifRepository,
    private val storageService: StorageService,
    private val appProperties: AppProperties
) {
    private val logger = LoggerFactory.getLogger(GifService::class.java)

    /**
     * Upload a new GIF
     */
    @Transactional
    fun upload(file: MultipartFile): Gif {
        validateFile(file)

        val id = UUID.randomUUID()
        val storageKey = generateStorageKey(id, file.originalFilename)

        logger.info("Uploading GIF: id=$id, filename=${file.originalFilename}, size=${file.size}")

        // Upload to Spaces
        file.inputStream.use { inputStream ->
            storageService.upload(
                key = storageKey,
                content = inputStream,
                contentType = file.contentType ?: "image/gif",
                contentLength = file.size
            )
        }

        // Save metadata to database
        val gif = Gif(
            id = id,
            originalFilename = file.originalFilename,
            storageKey = storageKey,
            contentType = file.contentType ?: "image/gif",
            fileSize = file.size
        )

        return gifRepository.save(gif)
    }

    /**
     * Get a GIF by ID (only active/non-deleted)
     */
    @Transactional(readOnly = true)
    fun findById(id: UUID): Gif? {
        return gifRepository.findActiveAndNotExpiredById(id)
    }

    /**
     * Get a GIF and increment view count
     */
    @Transactional
    fun findByIdAndIncrementViews(id: UUID): Gif? {
        val gif = gifRepository.findActiveAndNotExpiredById(id) ?: return null
        gifRepository.incrementViewCount(id)
        gif.incrementViewCount() // Update local instance
        return gif
    }

    /**
     * Delete a GIF (soft delete)
     */
    @Transactional
    fun delete(id: UUID): Boolean {
        val gif = gifRepository.findActiveById(id) ?: return false
        gif.softDelete()
        gifRepository.save(gif)

        // Optionally delete from storage immediately
        // storageService.delete(gif.storageKey)

        logger.info("GIF soft deleted: id=$id")
        return true
    }

    /**
     * Get the public share URL for a GIF
     */
    fun getShareUrl(gif: Gif): String {
        return "${appProperties.baseUrl}/${gif.id}"
    }

    /**
     * Get the CDN URL for a GIF
     */
    fun getCdnUrl(gif: Gif): String {
        return storageService.getCdnUrl(gif.storageKey)
    }

    private fun validateFile(file: MultipartFile) {
        if (file.isEmpty) {
            throw IllegalArgumentException("File is empty")
        }

        if (file.size > appProperties.gif.maxSizeBytes) {
            throw IllegalArgumentException(
                "File size ${file.size} exceeds maximum allowed ${appProperties.gif.maxSizeBytes} bytes"
            )
        }

        val contentType = file.contentType ?: "application/octet-stream"
        if (contentType !in appProperties.gif.allowedContentTypes) {
            throw IllegalArgumentException(
                "Content type $contentType is not allowed. Allowed types: ${appProperties.gif.allowedContentTypes}"
            )
        }
    }

    private fun generateStorageKey(id: UUID, originalFilename: String?): String {
        val extension = originalFilename?.substringAfterLast('.', "gif") ?: "gif"
        return "gifs/$id.$extension"
    }
}
