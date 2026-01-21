package it.polimi.mypolihub_spa.controller.api;

import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import it.polimi.mypolihub_spa.DTO.ExamDTO;
import it.polimi.mypolihub_spa.DTO.RegistrationDTO;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.ExamService;
import it.polimi.mypolihub_spa.utils.SortUtility;
import it.polimi.mypolihub_spa.utils.SortUtility.SortKey;

@RestController
@RequestMapping("/api")
public class ExamApiController {

    @Autowired
    private ExamService examService;

    @GetMapping("/exams")
    public List<ExamDTO> getAllExams(@RequestParam(name = "courseId", required = false) Integer courseId) {
        return examService.getExamsForCourse(courseId);
    }

    // -----------------------------
    // Professor operations
    // -----------------------------

    @GetMapping("/professor/exam")
    public List<RegistrationDTO> getRegistrationsByExamId(@RequestParam Integer examId,
            @AuthenticationPrincipal CustomUserDetails principal) {

        SortKey sortKey = SortUtility.getValidSortKeyFrom(SortUtility.DEFAULT_SORT);
        String sortDir = SortUtility.getValidSortDirFrom(SortUtility.DEFAULT_DIR);

        return examService.getStudentsByExamIdSortedBy(principal.getId(), examId, sortKey.jpa(), sortDir);
    }

    // -----------------------------
    // Student operations
    // -----------------------------

    @GetMapping("/student/exams/registered")
    public Set<Integer> getExamsWhereStudentIsRegistered(
            @RequestParam(name = "courseId", required = false) Integer courseId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return examService.getRegisteredExamIds(principal.getId(), courseId);
    }

    @PostMapping("/student/exam/{examId}/register")
    public void registerForExam(
            @PathVariable Integer examId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        examService.registerStudentForExam(principal.getId(), examId);
    }
}
