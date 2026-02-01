package me.cartergrove.gifclipper.api.dto

import me.cartergrove.gifclipper.domain.gif.Gif
import java.time.Instant
import java.util.UUID

data class GifResponse(
    val id: UUID,
    val url: String,
    val cdnUrl: String,
    val originalFilename: String?,
    val fileSize: Long,
    val width: Int?,
    val height: Int?,
    val durationMs: Int?,
    val viewCount: Long,
    val createdAt: Instant
) {
    companion object {
        fun from(gif: Gif, shareUrl: String, cdnUrl: String): GifResponse {
            return GifResponse(
                id = gif.id,
                url = shareUrl,
                cdnUrl = cdnUrl,
                originalFilename = gif.originalFilename,
                fileSize = gif.fileSize,
                width = gif.width,
                height = gif.height,
                durationMs = gif.durationMs,
                viewCount = gif.viewCount,
                createdAt = gif.createdAt
            )
        }
    }
}

data class GifUploadResponse(
    val id: UUID,
    val url: String,
    val cdnUrl: String,
    val createdAt: Instant
) {
    companion object {
        fun from(gif: Gif, shareUrl: String, cdnUrl: String): GifUploadResponse {
            return GifUploadResponse(
                id = gif.id,
                url = shareUrl,
                cdnUrl = cdnUrl,
                createdAt = gif.createdAt
            )
        }
    }
}

data class ErrorResponse(
    val error: String,
    val message: String,
    val timestamp: Instant = Instant.now()
)
