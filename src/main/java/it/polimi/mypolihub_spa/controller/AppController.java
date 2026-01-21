package it.polimi.mypolihub_spa.controller;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import it.polimi.mypolihub_spa.entity.Role;

@Controller
public class AppController {

    @GetMapping({"/app", "/", "/home"})
    public String initRoute(Authentication auth) {
        Role role = Role.from(auth);

        switch (role) {
            case PROFESSOR:
                return professorApp();
            case STUDENT:
                return studentApp();
            case ADMIN:
                return "redirect:/admin/panel";
            default:
                return "redirect:/";
        }
    }

    @GetMapping("/app/professor")
    public String professorApp() {
        return "forward:/professor.html";
    }

    @GetMapping("/app/student")
    public String studentApp() {
        return "forward:/student.html";
    }
}
