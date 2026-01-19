package it.polimi.mypolihub_spa.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.polimi.mypolihub_spa.DTO.CourseDTO;
import it.polimi.mypolihub_spa.entity.Course;
import it.polimi.mypolihub_spa.entity.Major;
import it.polimi.mypolihub_spa.entity.Professor;
import it.polimi.mypolihub_spa.entity.Semester;
import it.polimi.mypolihub_spa.repository.CourseRepository;
import it.polimi.mypolihub_spa.repository.MajorRepository;
import it.polimi.mypolihub_spa.repository.ProfessorRepository;

@Service
public class CourseService {

    @Autowired
    private MajorRepository majorRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Transactional
    public void createCourse(String rawName, Integer cfu, Semester semester, List<Integer> majorIds,
            List<Integer> yearsOfStudy, Integer professorId) {
        String name = rawName == null ? "" : rawName.trim().replaceAll("\\s+", " ");

        if (name.isBlank()) {
            throw new IllegalArgumentException("Course name is blank");
        }

        if (cfu == null) {
            throw new IllegalArgumentException("CFU is required");
        }

        if (semester == null) {
            throw new IllegalArgumentException("semester is required");
        }

        List<Major> majors = majorRepository.findAllByIdInOrder(majorIds);
        if (majors.isEmpty()) {
            throw new IllegalArgumentException("None of the major inserted exists");
        }

        if (majors.size() != yearsOfStudy.size()) {
            throw new IllegalArgumentException("The majors selected and relative years of study do not match");
        }

        Professor professor = professorRepository.findById(professorId)
                .orElseThrow(() -> new IllegalArgumentException("Professor does not exists"));

        Course course = new Course();
        course.setName(name);
        course.setCfu(cfu);
        course.setSemester(semester);
        course.setProfessor(professor);

        for (int i = 0; i < majors.size(); i++) {
            Major major = majors.get(i);
            Integer yearOfStudy = yearsOfStudy.get(i);

            if (yearOfStudy < 1 || yearOfStudy > major.getDegreeLevel().getYearsOfStudy()) {
                throw new IllegalArgumentException("The year inserted does not match the degree");
            }

            course.addMajor(major, yearOfStudy);
        }

        courseRepository.save(course);
    }

    @Transactional
    public List<CourseDTO> findCoursesByStudentIdOrderByNameDesc(Integer studentId) {
        List<CourseDTO> coursesDTO = new ArrayList<>();

        List<Course> courses = courseRepository.findByStudents_IdOrderByNameDesc(studentId);
        for (Course course : courses) {
            coursesDTO.add(new CourseDTO(course));
        }

        return coursesDTO;
    }

    @Transactional
    public List<CourseDTO> findCoursesByProfessorIdOrderByNameDesc(Integer professorId) {
        List<CourseDTO> coursesDTO = new ArrayList<>();

        List<Course> courses = courseRepository.findByProfessor_IdOrderByNameDesc(professorId);
        for (Course course : courses) {
            coursesDTO.add(new CourseDTO(course));
        }

        return coursesDTO;
    }

    @Transactional
    public List<CourseDTO> findCoursesByProfessorIdOrderByNameAsc(Integer professorId) {
        List<CourseDTO> coursesDTO = new ArrayList<>();

        List<Course> courses = courseRepository.findByProfessor_IdOrderByNameAsc(professorId);
        for (Course course : courses) {
            coursesDTO.add(new CourseDTO(course));
        }

        return coursesDTO;
    }
}
