package it.polimi.mypolihub_spa.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import it.polimi.mypolihub_spa.DTO.CourseDTO;
import it.polimi.mypolihub_spa.DTO.ReportDTO;
import it.polimi.mypolihub_spa.entity.Role;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.CourseService;
import it.polimi.mypolihub_spa.service.ReportService;
import it.polimi.mypolihub_spa.utils.SortUtility;
import it.polimi.mypolihub_spa.utils.SortUtility.SortKey;

@Controller
public class VerbaliController {

    @Autowired
    private CourseService courseService;

    @Autowired
    private ReportService reportService;

    @GetMapping("/professor/reports")
    public String verbali(
            @RequestParam(name = "courseId", required = false) Integer courseId,
            @RequestParam(name = "reportId", required = false) Integer reportId,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "sortDir", required = false) String sortDir,
            @AuthenticationPrincipal CustomUserDetails principal,
            Authentication auth,
            Model model) {

        if (reportId == null) {
            return showAllCoursesAndReportsIdRequested(courseId, principal, auth, model);
        } else {
            return showSingleReport(reportId, sort, sortDir, principal, auth, model);
        }
    }

    private String showSingleReport(
            Integer reportId,
            String sort,
            String sortDir,
            CustomUserDetails principal,
            Authentication auth,
            Model model) {

        Role role = Role.from(auth);

        if (reportId == null) {
            return "redirect:/home";
        }

        SortKey sortKey = SortUtility.getValidSortKeyFrom(sort);
        sortDir = SortUtility.getValidSortDirFrom(sortDir);

        ReportDTO report = null;
        try {
            report = reportService.getReportByIdSortedBy(principal.getId(), reportId, sortKey.jpa(), sortDir);

            fillSingleReportModel(report, model);
        } catch (IllegalArgumentException e) {
            model.addAttribute("errorMessage", e.getMessage());
        }

        addCommonReportAttributes(principal, role, reportId, sortKey, sortDir, model);

        return "report";
    }

    private void fillSingleReportModel(ReportDTO report, Model model) {
        model.addAttribute("report", report);
        model.addAttribute("examId", report.getExam().getId());
        model.addAttribute("registrations", report.getRegistrations());
        model.addAttribute("verbalizedCount", report.getRegistrations().size());
    }

    private void addCommonReportAttributes(
            CustomUserDetails principal,
            Role role,
            Integer reportId,
            SortKey sortKey,
            String sortDir,
            Model model) {

        model.addAttribute("reportId", reportId);

        model.addAttribute("sortKey", sortKey.ui());
        model.addAttribute("sortDir", sortDir);

        model.addAttribute("helloName", principal.getName());
        model.addAttribute("role", role);
    }

    private String showAllCoursesAndReportsIdRequested(
            Integer courseId,
            CustomUserDetails principal,
            Authentication auth,
            Model model) {
        Role role = Role.from(auth);

        List<CourseDTO> courses = courseService.findCoursesByProfessorIdOrderByNameAsc(principal.getId());

        List<ReportDTO> reports = List.of();
        if (teachesRequestedCourse(courseId, courses)) {
            reports = reportService.getReportsForCourse(principal.getId(), courseId);
        }

        fillExamsAndReportModel(principal, role, courseId, courses, reports, model);

        return "reports";
    }

    private boolean teachesRequestedCourse(Integer courseId, List<CourseDTO> courses) {
        if (courseId == null || courses.isEmpty()) {
            return false;
        }

        return courses.stream()
                .anyMatch(c -> c.getId().equals(courseId));
    }

    private void fillExamsAndReportModel(CustomUserDetails principal, Role role, Integer courseId,
            List<CourseDTO> courses, List<ReportDTO> reports, Model model) {
        model.addAttribute("selectedCourseId", courseId);
        model.addAttribute("courses", courses);
        model.addAttribute("reports", reports);

        model.addAttribute("helloName", principal.getName());
        model.addAttribute("role", role);
    }
}

