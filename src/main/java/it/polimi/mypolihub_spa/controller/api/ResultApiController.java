package it.polimi.mypolihub_spa.controller.api;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import it.polimi.mypolihub_spa.DTO.RegistrationDTO;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.ExamService;

@RestController
@RequestMapping("/api")
public class ResultApiController {

    @Autowired
    private ExamService examService;
    
    @GetMapping("/student/result")
    public Map<String, Object> getResultByExamId(@RequestParam Integer examId, @AuthenticationPrincipal CustomUserDetails principal) {
        RegistrationDTO registration = null;
        Boolean isPublished;
        Boolean canBeDeclined;
        String message = "";

        try {
            registration = examService.getResultByStudentIdAndExamId(principal.getId(), examId);
            isPublished = true;

            if (registration.canBeDeclined()) {
                canBeDeclined = true;
            } else {
                canBeDeclined = false;
            }
        } catch (IllegalArgumentException e) {
            isPublished = false;
            canBeDeclined = false;
            message = e.getMessage();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("registration", registration);
        response.put("isPublished", isPublished);
        response.put("canBeDeclined", canBeDeclined);
        response.put("message", message);

        return response;
    }

    @PatchMapping("/student/result/{examId}/decline")
    public void declineResult(@PathVariable Integer examId, @AuthenticationPrincipal CustomUserDetails principal) {
        examService.declineExamResult(principal.getId(), examId);
    }
}
