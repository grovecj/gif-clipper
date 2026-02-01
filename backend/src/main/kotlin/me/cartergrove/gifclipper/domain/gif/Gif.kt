package me.cartergrove.gifclipper.domain.gif

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "gifs")
class Gif(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "original_filename")
    var originalFilename: String? = null,

    @Column(name = "storage_key", nullable = false)
    var storageKey: String,

    @Column(name = "content_type", nullable = false)
    var contentType: String = "image/gif",

    @Column(name = "file_size", nullable = false)
    var fileSize: Long,

    @Column(name = "width")
    var width: Int? = null,

    @Column(name = "height")
    var height: Int? = null,

    @Column(name = "duration_ms")
    var durationMs: Int? = null,

    @Column(name = "frame_count")
    var frameCount: Int? = null,

    @Column(name = "view_count", nullable = false)
    var viewCount: Long = 0,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "expires_at")
    var expiresAt: Instant? = null,

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null
) {
    fun incrementViewCount() {
        viewCount++
    }

    fun softDelete() {
        deletedAt = Instant.now()
    }

    fun isDeleted(): Boolean = deletedAt != null

    fun isExpired(): Boolean = expiresAt?.let { Instant.now().isAfter(it) } ?: false

    fun isActive(): Boolean = !isDeleted() && !isExpired()
}
