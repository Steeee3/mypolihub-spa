package it.polimi.mypolihub_spa.controller.api;

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
import it.polimi.mypolihub_spa.utils.SortUtility;
import it.polimi.mypolihub_spa.utils.SortUtility.SortKey;

@RestController
@RequestMapping("/api")
public class IscrittiApiController {

    @Autowired
    private ExamService examService;

    @Autowired
    private ResultService resultService;

    @GetMapping("/results/valid-only")
    public List<ResultDTO> getAllValidResults() {
        List<ResultDTO> results = resultService.getAllResults();

        return results.stream()
                .filter(r -> r.getId() != DefaultValues.RESULT_VUOTO_ID)
                .toList();
    }

    @GetMapping("/professor/exam")
    public List<RegistrationDTO> getRegistrationsByExamId(@RequestParam Integer examId,
            @AuthenticationPrincipal CustomUserDetails principal) {

        SortKey sortKey = SortUtility.getValidSortKeyFrom(SortUtility.DEFAULT_SORT);
        String sortDir = SortUtility.getValidSortDirFrom(SortUtility.DEFAULT_DIR);

        return examService.getStudentsByExamIdSortedBy(principal.getId(), examId, sortKey.jpa(), sortDir);
    }

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
}
