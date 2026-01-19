package it.polimi.mypolihub_spa.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {

    @Id
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    @Column(name = "number", nullable = false, unique = true, updatable = false, insertable = false)
    private Integer number;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "major_id")
    private Major major;

    @ManyToMany(mappedBy = "students")
    private Set<Course> courses = new HashSet<>();

    public Integer getId() { return id; }
    public User getUser() { return user; }
    public Integer getNumber() { return number; }
    public Major getMajor() { return major; }

    public void setUser(User user) { this.user = user; }
    public void setMajor(Major major) { this.major = major; }

    public Set<Course> getCourses() {
        return courses;
    }
    public void addCourse(Course c) {
        courses.add(c);
        c.getStudents().add(this);
    }
    public void removeCourse(Course c) {
        courses.remove(c);
        c.getStudents().remove(this);
    }
}
