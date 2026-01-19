package it.polimi.mypolihub_spa.entity;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "majors")
public class Major {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", length = 50, nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "degree_level_id")
    private DegreeLevel degreeLevel;

    @OneToMany(mappedBy = "major", cascade = CascadeType.ALL, orphanRemoval = true)
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

    public DegreeLevel getDegreeLevel() {
        return degreeLevel;
    }

    public void setDegreeLevel(DegreeLevel degreeLevel) {
        this.degreeLevel = degreeLevel;
    }

    public Set<CourseMajor> getCourseMajors() {
        return courseMajors;
    }

    public List<Course> getCourses() {
        return courseMajors.stream()
            .map (cm -> cm.getCourse())
            .toList();
    }

    public void addCourse(Course course, Integer yearOfStudy) {
        CourseMajor cm = new CourseMajor();

        cm.setMajor(this);
        cm.setCourse(course);
        cm.setYearOfStudy(yearOfStudy);

        courseMajors.add(cm);
        course.getCourseMajors().add(cm);
    }
}
