package it.polimi.mypolihub_spa.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import it.polimi.mypolihub_spa.DTO.UserImportReportDTO;
import it.polimi.mypolihub_spa.entity.Role;
import it.polimi.mypolihub_spa.entity.Semester;
import it.polimi.mypolihub_spa.repository.CourseRepository;
import it.polimi.mypolihub_spa.repository.DegreeLevelRepository;
import it.polimi.mypolihub_spa.repository.MajorRepository;
import it.polimi.mypolihub_spa.repository.ProfessorRepository;
import it.polimi.mypolihub_spa.repository.UserRepository;
import it.polimi.mypolihub_spa.service.CourseService;
import it.polimi.mypolihub_spa.service.ExamService;
import it.polimi.mypolihub_spa.service.MajorService;
import it.polimi.mypolihub_spa.service.UserCreatorService;

@Controller
@RequestMapping("/admin")
public class AdminPanelController {

    @Autowired
    private UserCreatorService userCreatorService;

    @Autowired
    private MajorService majorService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private ExamService examService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private MajorRepository majorRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private DegreeLevelRepository degreeLevelRepository;

    @GetMapping("/panel")
    public String panel(Model model) {
        fillPanelModel(model, null);

        return "admin/panel";
    }

    @PostMapping("/import-users")
    public String importUsers(@RequestParam("file") MultipartFile file,
            @RequestParam("role") Role role,
            @RequestParam("defaultPassword") String defaultPassword,
            @RequestParam(value = "majorId", required = false) Integer majorId,
            Model model) {
        UserImportReportDTO report = userCreatorService.importUsersFromUpload(file, role, defaultPassword, majorId);

        fillPanelModel(model, report);

        return "admin/panel";
    }

    @PostMapping("/users")
    public String importSingleUser(
            @RequestParam("role") Role role,
            @RequestParam("name") String name,
            @RequestParam("surname") String surname,
            @RequestParam("password") String password,
            @RequestParam(value = "majorId", required = false) Integer majorId,
            Model model) {
        UserImportReportDTO report = userCreatorService.createSingleUser(role, name, surname, password, majorId);

        fillPanelModel(model, report);

        return "admin/panel";
    }

    @PostMapping("/majors")
    public String createMajor(@RequestParam("majorName") String majorName, @RequestParam("degreeLevelId") Integer degreeLevelId,
            Model model) {

        try {
            majorService.createMajor(majorName, degreeLevelId);
            model.addAttribute("majorMsg", "Major creata: " + majorName);
        } catch (IllegalArgumentException e) {
            model.addAttribute("majorError", e.getMessage());
        }

        fillPanelModel(model, null);

        return "admin/panel";
    }

    @PostMapping("/courses")
    public String createCourse(@RequestParam("courseName") String courseName,
        @RequestParam("cfu") Integer cfu,
        @RequestParam("semester") Semester semester,
        @RequestParam("majorId") List<Integer> majorIds,
        @RequestParam("yearsOfStudy") List<Integer> yearsOfStudy,
        @RequestParam("professorId") Integer professorId,
        Model model) {
        try {
            courseService.createCourse(courseName, cfu, semester, majorIds, yearsOfStudy, professorId);
            model.addAttribute("majorMsg", "Corso creato: " + courseName);
        } catch (IllegalArgumentException e) {
            model.addAttribute("majorError", e.getMessage());
        }

        fillPanelModel(model, null);

        return "admin/panel";
    }

    @PostMapping("/exams")
    public String createExamCall(@RequestParam("courseId") Integer courseId, @RequestParam("date") LocalDateTime date,
            Model model) {
        try {
            examService.addExamCall(courseId, date);
            model.addAttribute("examMsg", "Esame aggiunto");
        } catch (IllegalArgumentException e) {
            model.addAttribute("examError", e.getMessage());
        }

        fillPanelModel(model, null);

        return "admin/panel";
    }

    private void fillPanelModel(Model model, Object report) {
        model.addAttribute("majors", majorRepository.findAllWithDegreeLevel());
        model.addAttribute("degreeLevels", degreeLevelRepository.findAll());
        model.addAttribute("usersCount", userRepository.count());
        model.addAttribute("coursesCount", courseRepository.count());
        model.addAttribute("professors", professorRepository.findAllWithUser());
        model.addAttribute("courses", courseRepository.findAll());
        model.addAttribute("report", report);
    }
}
