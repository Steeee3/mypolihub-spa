package it.polimi.mypolihub_spa.entity;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "courses", indexes = {
        @Index(name = "FK_courses_professors", columnList = "professor_id")
})
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "cfu", nullable = false)
    private Integer cfu;

    @Column(name = "year", nullable = false)
    private String year;

    @Enumerated(EnumType.STRING)
    @Column(name = "semester", nullable = false)
    private Semester semester;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professor_id", nullable = false)
    private Professor professor;

    @ManyToMany
    @JoinTable(name = "courses_students", joinColumns = @JoinColumn(name = "course_id"), inverseJoinColumns = @JoinColumn(name = "student_id"))
    private Set<Student> students = new HashSet<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<CourseMajor> courseMajors = new LinkedHashSet<>();

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getCfu() {
        return cfu;
    }

    public void setCfu(Integer cfu) {
        this.cfu = cfu;
    }

    public String getYear() {
        return year;
    }

    public void setYear(String year) {
        this.year = year;
    }

    public Semester getSemester() {
        return semester;
    }

    public void setSemester(Semester semester) {
        this.semester = semester;
    }

    public Professor getProfessor() {
        return professor;
    }

    public void setProfessor(Professor professor) {
        this.professor = professor;
    }

    public Set<Student> getStudents() {
        return students;
    }
    public void addStudent(Student s) {
        students.add(s);
        s.getCourses().add(this);
    }
    public void removeStudent(Student s) {
        students.remove(s);
        s.getCourses().remove(this);
    }

    public Set<CourseMajor> getCourseMajors() {
        return courseMajors;
    }

    public List<Major> getMajors() {
        return courseMajors.stream()
            .map(cm -> cm.getMajor())
            .toList();
    }

    public void addMajor(Major major, Integer yearOfStudy) {
        CourseMajor cm = new CourseMajor();

        cm.setCourse(this);
        cm.setMajor(major);
        cm.setYearOfStudy(yearOfStudy);

        courseMajors.add(cm);
        major.getCourseMajors().add(cm);
    }

    public Integer getYearOfStudyForMajor(Major major) {
        return courseMajors.stream()
            .filter(cm -> cm.getMajor().getId() == major.getId())
            .map(cm -> cm.getYearOfStudy())
            .findFirst()
            .orElse(null);
    }
}
