package it.polimi.mypolihub_spa.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.Report;

public interface ReportRepository extends JpaRepository<Report, Integer> {
    boolean existsByIdAndExam_Course_Professor_Id(Integer reportId, Integer professorId);
    List<Report> findAllByExam_Course_IdAndExam_Course_Professor_IdOrderByExam_DateAsc(Integer courseId, Integer professorId);
}
