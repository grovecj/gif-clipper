package me.cartergrove.gifclipper.api.controller

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException
import java.time.Instant

@Controller
@RequestMapping("/download")
class DownloadController {

    private val logger = LoggerFactory.getLogger(DownloadController::class.java)
    private val restClient = RestClient.builder()
        .baseUrl("https://api.github.com")
        .defaultHeader("Accept", "application/vnd.github+json")
        .defaultHeader("User-Agent", "gif-clipper-backend")
        .build()

    private val cacheDuration = java.time.Duration.ofMinutes(15)

    @Volatile
    private var cachedWindowsUrl: CachedUrl? = null

    @GetMapping("/windows")
    fun downloadWindows(): String {
        val url = getLatestWindowsUrl()
        return "redirect:$url"
    }

    private fun getLatestWindowsUrl(): String {
        val cached = cachedWindowsUrl
        if (cached != null && Instant.now().isBefore(cached.expiresAt)) {
            return cached.url
        }

        return try {
            val release = restClient.get()
                .uri("/repos/grovecj/gif-clipper/releases/latest")
                .retrieve()
                .body(GitHubRelease::class.java)

            val asset = release?.assets?.firstOrNull { it.name.endsWith(".exe") }
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "No Windows installer found in latest release")

            val url = asset.browserDownloadUrl
            cachedWindowsUrl = CachedUrl(url, Instant.now().plus(cacheDuration))
            url
        } catch (e: ResponseStatusException) {
            throw e
        } catch (e: Exception) {
            logger.warn("Failed to fetch latest release from GitHub: ${e.message}")
            // Fallback to releases page
            FALLBACK_URL
        }
    }

    private data class CachedUrl(val url: String, val expiresAt: Instant)

    companion object {
        private const val FALLBACK_URL = "https://github.com/grovecj/gif-clipper/releases/latest"
    }
}

data class GitHubRelease(
    val assets: List<GitHubAsset> = emptyList()
)

data class GitHubAsset(
    val name: String = "",
    @com.fasterxml.jackson.annotation.JsonProperty("browser_download_url")
    val browserDownloadUrl: String = ""
)
