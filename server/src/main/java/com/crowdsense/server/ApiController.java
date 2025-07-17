package com.crowdsense.server;

import org.springframework.stereotype.Controller; 
import org.springframework.web.bind.annotation.GetMapping; 
import org.springframework.web.bind.annotation.ResponseBody;

import io.github.cdimascio.dotenv.Dotenv; 

@Controller
public class ApiController {
    @GetMapping("/request")
    @ResponseBody
    public String Response() {

        Dotenv dotenv = Dotenv.load();
        String result = dotenv.get("DATABASE_URL");

        return result;
    }
}
