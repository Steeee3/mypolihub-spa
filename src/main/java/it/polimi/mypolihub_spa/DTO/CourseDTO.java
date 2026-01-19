package it.polimi.mypolihub_spa.DTO;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import it.polimi.mypolihub_spa.entity.Course;
import it.polimi.mypolihub_spa.entity.Major;
import it.polimi.mypolihub_spa.entity.Semester;
import it.polimi.mypolihub_spa.entity.Student;

public class CourseDTO {
    private Integer id;
    private String name;
    private Integer cfu;
    private Semester semester;
    private ProfessorDTO professor;
    private Set<StudentDTO> students;
    private Map<MajorDTO, Integer> majorAndYear;

    public CourseDTO(Course course) {
        id = course.getId();
        name = course.getName();
        cfu = course.getCfu();
        semester = course.getSemester();

        professor = new ProfessorDTO(course.getProfessor());

        students = new HashSet<>();
        for (Student s : course.getStudents()) {
            students.add(new StudentDTO(s));
        }

        majorAndYear = new HashMap<>();
        for (Major m : course.getMajors()) {
            Integer yearOfStudy = course.getYearOfStudyForMajor(m);

            majorAndYear.put(new MajorDTO(m), yearOfStudy);
        }
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Integer getCfu() {
        return cfu;
    }

    public Semester getSemester() {
        return semester;
    }

    public ProfessorDTO getProfessor() {
        return professor;
    }

    public Set<StudentDTO> getStudents() {
        return students;
    }

    public List<MajorDTO> getMajors() {
        return majorAndYear.keySet().stream().toList();
    }

    public Integer getYearOfStudyForMajor(MajorDTO major) {
        return majorAndYear.get(major);
    }
}
