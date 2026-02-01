package me.cartergrove.gifclipper.api.controller

import me.cartergrove.gifclipper.api.dto.ErrorResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException

@RestControllerAdvice
class GlobalExceptionHandler {
    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(e: IllegalArgumentException): ResponseEntity<ErrorResponse> {
        logger.warn("Bad request: ${e.message}")
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = "BAD_REQUEST", message = e.message ?: "Invalid request"))
    }

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxSizeExceeded(e: MaxUploadSizeExceededException): ResponseEntity<ErrorResponse> {
        logger.warn("File too large: ${e.message}")
        return ResponseEntity
            .status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(ErrorResponse(error = "FILE_TOO_LARGE", message = "File exceeds maximum allowed size"))
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(e: Exception): ResponseEntity<ErrorResponse> {
        logger.error("Unexpected error", e)
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(error = "INTERNAL_ERROR", message = "An unexpected error occurred"))
    }
}
