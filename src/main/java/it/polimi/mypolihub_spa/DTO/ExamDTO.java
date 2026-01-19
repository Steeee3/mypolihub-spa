package it.polimi.mypolihub_spa.DTO;

import java.time.LocalDateTime;

import it.polimi.mypolihub_spa.entity.Exam;

public class ExamDTO {
    private Integer id;
    private LocalDateTime date;
    private CourseDTO course;

    public ExamDTO(Exam exam) {
        id = exam.getId();
        date = exam.getDate();
        course = new CourseDTO(exam.getCourse());
    }

    public Integer getId() {
        return id;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public CourseDTO getCourse() {
        return course;
    }
}
