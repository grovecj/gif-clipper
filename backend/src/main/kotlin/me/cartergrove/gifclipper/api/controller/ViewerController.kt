package me.cartergrove.gifclipper.api.controller

import me.cartergrove.gifclipper.service.GifService
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import java.util.UUID

@Controller
class ViewerController(
    private val gifService: GifService
) {

    @GetMapping("/{id}")
    fun viewGif(@PathVariable id: UUID, model: Model): String {
        val gif = gifService.findByIdAndIncrementViews(id)
            ?: return "error/404"

        val shareUrl = gifService.getShareUrl(gif)
        val cdnUrl = gifService.getCdnUrl(gif)

        model.addAttribute("gif", gif)
        model.addAttribute("shareUrl", shareUrl)
        model.addAttribute("cdnUrl", cdnUrl)
        model.addAttribute("fileSizeFormatted", formatFileSize(gif.fileSize))

        return "viewer"
    }

    private fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> String.format("%.1f MB", bytes / (1024.0 * 1024.0))
        }
    }
}
