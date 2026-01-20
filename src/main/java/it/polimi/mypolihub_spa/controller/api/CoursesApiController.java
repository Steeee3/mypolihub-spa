package it.polimi.mypolihub_spa.controller.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import it.polimi.mypolihub_spa.DTO.CourseDTO;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.CourseService;
import it.polimi.mypolihub_spa.utils.SortUtility;

@RestController
@RequestMapping("/api")
public class CoursesApiController {

    @Autowired
    private CourseService courseService;
    
    @GetMapping("/professor/courses")
    public List<CourseDTO> getCoursesForProfessor(
            @RequestParam(name = "sortDir", required = false) String sortDir,
            @AuthenticationPrincipal CustomUserDetails principal) {
        
        String sortDirection = SortUtility.getValidSortDirFrom(sortDir);
        
        if (sortDirection.equals(SortUtility.SORT_DIR_DESC)) {
            return courseService.findCoursesByProfessorIdOrderByNameDesc(principal.getId());
        } else {
            return courseService.findCoursesByProfessorIdOrderByNameAsc(principal.getId());
        }
    }

    @GetMapping("/student/courses")
    public List<CourseDTO> getCoursesForStudent(@AuthenticationPrincipal CustomUserDetails principal) {
        return courseService.findCoursesByStudentIdOrderByNameDesc(principal.getId());
    }
}
