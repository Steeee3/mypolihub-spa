package it.polimi.mypolihub_spa.controller;

import java.util.List;
import java.util.Set;

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

import it.polimi.mypolihub_spa.DTO.CourseDTO;
import it.polimi.mypolihub_spa.DTO.ExamDTO;
import it.polimi.mypolihub_spa.entity.Role;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.CourseService;
import it.polimi.mypolihub_spa.service.ExamService;

@Controller
public class HomeController {

    @Autowired
    private CourseService courseService;

    @Autowired
    private ExamService examService;

    @GetMapping({ "/", "/home" })
    public String home(
            @RequestParam(name = "courseId", required = false) Integer courseId,
            @AuthenticationPrincipal CustomUserDetails principal,
            Authentication auth,
            Model model) {

        List<CourseDTO> courses;
        List<ExamDTO> exams = List.of();

        Role role = Role.from(auth);

        switch (role) {
            case STUDENT:
                courses = courseService.findCoursesByStudentIdOrderByNameDesc(principal.getId());
                break;
            case PROFESSOR:
                courses = courseService.findCoursesByProfessorIdOrderByNameDesc(principal.getId());
                break;
            case ADMIN:
                return "redirect:/admin/panel";
            default:
                throw new IllegalStateException("Ruolo " + role + " non supportato");
        }

        if (subscribedToRequestedCourse(courseId, courses)) {
            exams = examService.getExamsForCourse(courseId);
        }

        fillModel(principal, role, courseId, courses, exams, model);

        return "home";
    }

    private boolean subscribedToRequestedCourse(Integer courseId, List<CourseDTO> courses) {
        if (courseId == null || courses.isEmpty()) {
            return false;
        }

        return courses.stream()
            .anyMatch(c -> c.getId().equals(courseId));
    }

    private void fillModel(CustomUserDetails principal, Role role, Integer courseId, List<CourseDTO> courses, List<ExamDTO> exams, Model model) {
        if (studentRequestedExams(courseId, role)) {
            Set<Integer> examsWhichStudentRegistered = examService.getRegisteredExamIds(principal.getId(), courseId);

            model.addAttribute("registeredExamIds", examsWhichStudentRegistered);
        }

        model.addAttribute("courses", courses);
        model.addAttribute("selectedCourseId", courseId);
        model.addAttribute("exams", exams);
        
        model.addAttribute("helloName", principal.getName());
        model.addAttribute("role", role);
    }

    private boolean studentRequestedExams(Integer courseId, Role role) {
        if (courseId == null || role != Role.STUDENT) {
            return false;
        }
        return true;
    }

    @PostMapping("/student/exam/{examId}/register")
    public String registerForExam(
        @PathVariable Integer examId,
        @RequestParam(name = "courseId", required = false) Integer courseId,
        @AuthenticationPrincipal CustomUserDetails principal,
        RedirectAttributes ra
    ) {
        examService.registerStudentForExam(principal.getId(), examId);

        if (courseId != null) {
            ra.addAttribute("courseId", courseId);
            return "redirect:/home#course-" + courseId;
        }

        return "redirect:/home";
    }
}

