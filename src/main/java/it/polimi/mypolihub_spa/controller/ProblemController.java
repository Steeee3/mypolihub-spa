package it.polimi.mypolihub_spa.controller;

import java.time.Instant;

import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Controller
public class ProblemController implements ErrorController {

    @GetMapping("/problem")
    public String problem(
            @RequestParam(name = "code", required = false) Integer code,
            @ModelAttribute("message") String message,
            Model model,
            HttpServletResponse response) {
        int status = (code == null ? 500 : code);
        response.setStatus(status);

        fillModel(model, status, message);
        return "error/problem";
    }

    @RequestMapping("/error")
    public String error(HttpServletRequest request, HttpServletResponse response, Model model) {
        Integer statusCode = (Integer) request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        String message = (String) request.getAttribute(RequestDispatcher.ERROR_MESSAGE);

        int status = (statusCode != null ? statusCode : 500);
        response.setStatus(status);

        fillModel(model, status, message);
        return "error/problem";
    }

    private void fillModel(Model model, int status, String message) {

        model.addAttribute("status", status);
        model.addAttribute("title", titleFor(status));
        model.addAttribute("timestamp", Instant.now().toString());

        if (message != null && !message.isBlank()) {
            model.addAttribute("message", message);
        } else {
            model.addAttribute("message", fallbackMessageFor(status, message));
        }
    }

    private String titleFor(int status) {
        return switch (status) {
            case 401 -> "Non autenticato";
            case 403 -> "Accesso negato";
            case 404 -> "Pagina non trovata";
            case 400 -> "Richiesta non valida";
            default -> "Si è verificato un errore";
        };
    }

    private String fallbackMessageFor(int status, String messageFromContainer) {
        if (messageFromContainer != null && !messageFromContainer.isBlank())
            return messageFromContainer;

        return switch (status) {
            case 401 -> "Devi effettuare il login per continuare.";
            case 403 -> "Non hai i permessi per accedere a questa risorsa.";
            case 404 -> "La risorsa richiesta non esiste oppure è stata spostata.";
            case 400 -> "Controlla i parametri inviati e riprova.";
            default -> "Riprova tra poco.";
        };
    }
}
