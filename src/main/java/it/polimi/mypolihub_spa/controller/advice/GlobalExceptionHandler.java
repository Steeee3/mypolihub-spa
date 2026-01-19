package it.polimi.mypolihub_spa.controller.advice;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public String handleDenied(AccessDeniedException e, RedirectAttributes ra) {
        ra.addFlashAttribute("message", e.getMessage());
        return "redirect:/problem?code=403";
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public String handleBadRequest(IllegalArgumentException e, RedirectAttributes ra) {
        ra.addFlashAttribute("message", e.getMessage());
        return "redirect:/problem?code=400";
    }

    @ExceptionHandler(IllegalStateException.class)
    public String handleDBError(IllegalStateException e, RedirectAttributes ra) {
        ra.addFlashAttribute("message", e.getMessage());
        return "redirect:/problem?code=500";
    }
}
