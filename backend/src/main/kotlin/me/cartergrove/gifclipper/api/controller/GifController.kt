package me.cartergrove.gifclipper.api.controller

import me.cartergrove.gifclipper.api.dto.GifResponse
import me.cartergrove.gifclipper.api.dto.GifUploadResponse
import me.cartergrove.gifclipper.service.GifService
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
@RequestMapping("/api/gifs")
class GifController(
    private val gifService: GifService
) {
    private val logger = LoggerFactory.getLogger(GifController::class.java)

    /**
     * Upload a new GIF
     */
    @PostMapping
    fun upload(@RequestParam("file") file: MultipartFile): ResponseEntity<GifUploadResponse> {
        logger.info("Received upload request: filename=${file.originalFilename}, size=${file.size}")

        val gif = gifService.upload(file)
        val shareUrl = gifService.getShareUrl(gif)
        val cdnUrl = gifService.getCdnUrl(gif)

        val response = GifUploadResponse.from(gif, shareUrl, cdnUrl)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    /**
     * Get GIF metadata by ID
     */
    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<GifResponse> {
        val gif = gifService.findById(id)
            ?: return ResponseEntity.notFound().build()

        val shareUrl = gifService.getShareUrl(gif)
        val cdnUrl = gifService.getCdnUrl(gif)

        return ResponseEntity.ok(GifResponse.from(gif, shareUrl, cdnUrl))
    }

    /**
     * Delete a GIF
     */
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        val deleted = gifService.delete(id)
        return if (deleted) {
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }
}
