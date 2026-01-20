package it.polimi.mypolihub_spa.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AppController {

    @GetMapping("/app/professor")
    public String professorApp() {
        return "forward:/professor.html";
    }

    @GetMapping("/app/student")
    public String studentApp() {
        return "forward:/student.html";
    }
}
