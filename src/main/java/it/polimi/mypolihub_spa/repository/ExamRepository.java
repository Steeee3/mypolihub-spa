package it.polimi.mypolihub_spa.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.Exam;

public interface ExamRepository extends JpaRepository<Exam, Integer> {
    boolean existsByIdAndCourse_Professor_Id(Integer examId, Integer professorId);
    boolean existsByIdAndCourse_Students_Id(Integer examId, Integer studentId);
    List<Exam> findAllByCourse_IdOrderByDateDesc(Integer courseId);
}

