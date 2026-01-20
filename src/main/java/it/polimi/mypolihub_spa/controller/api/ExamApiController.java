package it.polimi.mypolihub_spa.controller.api;

import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import it.polimi.mypolihub_spa.DTO.ExamDTO;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.ExamService;

@RestController
@RequestMapping("/api")
public class ExamApiController {

    @Autowired
    private ExamService examService;

    @GetMapping("/exams")
    public List<ExamDTO> getAllExams(@RequestParam(name = "courseId", required = false) Integer courseId) {
        return examService.getExamsForCourse(courseId);
    }

    @GetMapping("/student/exams/registered")
    public Set<Integer> getExamsWhereStudentIsRegistered(@RequestParam(name = "courseId", required = false) Integer courseId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return examService.getRegisteredExamIds(principal.getId(), courseId);
    }
}
