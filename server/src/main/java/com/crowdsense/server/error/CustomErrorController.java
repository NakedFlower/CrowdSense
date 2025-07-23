package com.crowdsense.server.error;

import com.crowdsense.server.dto.ApiResponse;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
@RequestMapping(value = "/error", produces = MediaType.APPLICATION_JSON_VALUE)
public class CustomErrorController implements ErrorController {

    @RequestMapping
    public ResponseEntity<ApiResponse<Object>> handleError(HttpServletRequest request) {

        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = statusObj != null ? Integer.parseInt(statusObj.toString()) : 500;

        ApiResponse<Object> body = new ApiResponse<>(status, Collections.emptyList());

        return ResponseEntity.status(status).body(body);
    }
}
