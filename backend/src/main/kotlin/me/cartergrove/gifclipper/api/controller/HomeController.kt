package me.cartergrove.gifclipper.api.controller

import me.cartergrove.gifclipper.service.GifService
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping

@Controller
class HomeController(
    private val gifService: GifService
) {

    @GetMapping("/")
    fun home(model: Model): String {
        model.addAttribute("trendingGifs", gifService.findTrending())
        model.addAttribute("topGifs", gifService.findTopByViews())
        return "index"
    }
}
