package com.fitness.userservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Turns unhandled exceptions into consistent JSON error bodies so the gateway
 * (and ultimately the frontend) get a predictable shape instead of a raw 500.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        return ResponseEntity.status(ex.getStatusCode()).body(body(status, ex.getReason()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body(500, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        Map<String, Object> body = body(400, "Validation failed");
        body.put("errors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    private Map<String, Object> body(int status, String message) {
        Map<String, Object> b = new HashMap<>();
        b.put("timestamp", LocalDateTime.now().toString());
        b.put("status", status);
        b.put("message", message);
        return b;
    }
}
