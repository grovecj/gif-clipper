package me.cartergrove.gifclipper

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class GifClipperApplication

fun main(args: Array<String>) {
    runApplication<GifClipperApplication>(*args)
}
