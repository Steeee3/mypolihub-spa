package it.polimi.mypolihub_spa.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.Course;

public interface CourseRepository extends JpaRepository<Course, Integer> {
    List<Course> findByStudents_IdOrderByNameDesc(Integer studentId);
    List<Course> findByProfessor_IdOrderByNameDesc(Integer professorId);
    List<Course> findByProfessor_IdOrderByNameAsc(Integer professorId);
}

