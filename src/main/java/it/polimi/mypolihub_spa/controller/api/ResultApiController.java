package it.polimi.mypolihub_spa.controller.api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import it.polimi.mypolihub_spa.DTO.BulkResultUpdateDTO;
import it.polimi.mypolihub_spa.DTO.RegistrationDTO;
import it.polimi.mypolihub_spa.DTO.ResultDTO;
import it.polimi.mypolihub_spa.entity.DefaultValues;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.ExamService;
import it.polimi.mypolihub_spa.service.ResultService;

@RestController
@RequestMapping("/api")
public class ResultApiController {

    @Autowired
    private ResultService resultService;

    @Autowired
    private ExamService examService;

    @GetMapping("/results/valid-only")
    public List<ResultDTO> getAllValidResults() {
        List<ResultDTO> results = resultService.getAllResults();

        return results.stream()
                .filter(r -> r.getId() != DefaultValues.RESULT_VUOTO_ID)
                .toList();
    }

    // -----------------------------
	// Professor operations
	// -----------------------------

    @PatchMapping("/professor/registrations/{registrationId}/result")
    public RegistrationDTO editResult(
            @PathVariable Integer registrationId,
            @RequestParam Integer resultId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        examService.setResult(principal.getId(), registrationId, resultId);

        return examService.getRegistrationById(principal.getId(), registrationId);
    }

    @PatchMapping("/professor/registrations/results")
    public List<RegistrationDTO> editResultBulk(
            @RequestBody List<BulkResultUpdateDTO> updates,
            @AuthenticationPrincipal CustomUserDetails principal) {
        examService.setResultBulk(principal.getId(), updates);

        List<Integer> registrationIds = updates.stream()
                .map(u -> u.registrationId())
                .toList();

        return examService.getAllRegistrationsById(principal.getId(), registrationIds);
    }

    @PostMapping("/professor/exam/{examId}/publish")
    public void publishResults(@PathVariable Integer examId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        examService.publishResults(principal.getId(), examId);
    }

    @PostMapping("/professor/exam/{examId}/finalize")
    public Map<String, Integer> finalizeResults(@PathVariable Integer examId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        int reportId = examService.finalizeResults(principal.getId(), examId);

        return Map.of("reportId", reportId);
    }

    // -----------------------------
	// Student operations
	// -----------------------------

    @GetMapping("/student/result")
    public Map<String, Object> getResultByExamId(@RequestParam Integer examId,
            @AuthenticationPrincipal CustomUserDetails principal) {
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
