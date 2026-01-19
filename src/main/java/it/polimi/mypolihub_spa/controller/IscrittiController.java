package it.polimi.mypolihub_spa.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import it.polimi.mypolihub_spa.DTO.RegistrationDTO;
import it.polimi.mypolihub_spa.DTO.ResultDTO;
import it.polimi.mypolihub_spa.entity.DefaultValues;
import it.polimi.mypolihub_spa.entity.Role;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.ExamService;
import it.polimi.mypolihub_spa.service.ResultService;
import it.polimi.mypolihub_spa.utils.SortUtility;
import it.polimi.mypolihub_spa.utils.SortUtility.SortKey;

@Controller
public class IscrittiController {

    @Autowired
    private ExamService examService;

    @Autowired
    private ResultService resultService;

    @GetMapping("/professor/exam")
    public String iscritti(
            @RequestParam(name = "examId", required = false) Integer examId,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "sortDir", required = false) String sortDir,
            @RequestParam(name = "editStudentNumber", required = false) Integer editStudentNumber,
            @AuthenticationPrincipal CustomUserDetails principal,
            Authentication auth,
            Model model) {
        Role role = Role.from(auth);

        if (examId == null) {
            return "redirect:/home";
        }

        SortKey sortKey = SortUtility.getValidSortKeyFrom(sort);
        sortDir = SortUtility.getValidSortDirFrom(sortDir);

        List<RegistrationDTO> registrations = examService.getStudentsByExamIdSortedBy(principal.getId(), examId,
                sortKey.jpa(), sortDir);

        fillModel(role, principal, examId, sortDir, sortKey.ui(), registrations, editStudentNumber, model);

        return "iscritti";
    }

    private void fillModel(
            Role role,
            CustomUserDetails principal,
            Integer examId,
            String sortDir,
            String sortKey,
            List<RegistrationDTO> registrations,
            Integer editedStudentNumber,
            Model model) {
        List<ResultDTO> results = getAllResults();

        model.addAttribute("examId", examId);
        model.addAttribute("sortDir", sortDir);
        model.addAttribute("sortKey", sortKey);

        model.addAttribute("registrations", registrations);
        model.addAttribute("results", results);
        model.addAttribute("editStudentNumber", editedStudentNumber);

        model.addAttribute("helloName", principal.getName());
        model.addAttribute("role", role);
    }

    private List<ResultDTO> getAllResults() {
        List<ResultDTO> results = resultService.getAllResults();

        return results.stream()
                .filter(r -> r.getId() != DefaultValues.RESULT_VUOTO_ID)
                .toList();
    }

    @PostMapping("/professor/registrations/{registrationId}/result")
    public String editResult(
            @PathVariable Integer registrationId,
            @RequestParam Integer resultId,
            @RequestParam(name = "examId", required = false) Integer examId,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "sortDir", required = false) String sortDir,
            @AuthenticationPrincipal CustomUserDetails principal,
            RedirectAttributes ra) {
        try {
            examService.setResult(principal.getId(), registrationId, resultId);
        } catch (IllegalArgumentException e) {
            ra.addFlashAttribute("errorMessage", e.getMessage());
        }
        if (examId == null) {
            return "redirect:/home";
        }

        addRedirectAttributes(examId, sort, sortDir, ra);

        return "redirect:/professor/exam";
    }

    private void addRedirectAttributes(Integer examId, String sort, String sortDir, RedirectAttributes ra) {
        ra.addAttribute("examId", examId);
        ra.addAttribute("sort", sort);
        ra.addAttribute("sortDir", sortDir);
    }

    @PostMapping("/professor/exam/{examId}/publish")
    public String publishResults(
            @PathVariable Integer examId,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "sortDir", required = false) String sortDir,
            @AuthenticationPrincipal CustomUserDetails principal,
            RedirectAttributes ra) {
        try {
            examService.publishResults(principal.getId(), examId);
        } catch (IllegalArgumentException e) {
            ra.addFlashAttribute("errorMessage", e.getMessage());
        }

        addRedirectAttributes(examId, sort, sortDir, ra);

        return "redirect:/professor/exam";
    }

    @PostMapping("/professor/exam/{examId}/finalize")
    public String finalizeResults(
            @PathVariable Integer examId,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "sortDir", required = false) String sortDir,
            @AuthenticationPrincipal CustomUserDetails principal,
            RedirectAttributes ra) {
        try {
            int reportId = examService.finalizeResults(principal.getId(), examId);

            ra.addAttribute("reportId", reportId);
            return "redirect:/professor/reports";
        } catch (IllegalArgumentException e) {
            ra.addFlashAttribute("errorMessage", e.getMessage());
        }

        addRedirectAttributes(examId, sort, sortDir, ra);

        return "redirect:/professor/exam";
    }
}
