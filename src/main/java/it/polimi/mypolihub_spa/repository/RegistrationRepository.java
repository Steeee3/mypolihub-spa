package it.polimi.mypolihub_spa.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import it.polimi.mypolihub_spa.entity.Registration;
import it.polimi.mypolihub_spa.entity.Report;
import it.polimi.mypolihub_spa.entity.Status;

public interface RegistrationRepository extends JpaRepository<Registration, Integer> {
	boolean existsByIdAndExam_Course_Professor_Id(Integer registrationId, Integer professorId);
	boolean existsByStudent_IdAndExam_Id(Integer studentId, Integer examId);
    List<Registration> findByExam_Id(Integer examId, Sort sort);
    List<Registration> findByReport_Id(Integer reportId, Sort sort);

    @Query("""
                select r.exam.id
                from Registration r
                where r.student.id = :studentId
                  and r.exam.course.id = :courseId
            """)
    Set<Integer> findRegisteredExamIdsByStudentAndCourse(Integer studentId, Integer courseId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                update Registration r
                set r.status = :published
                where r.exam.id = :examId
                    and r.status.id = :insertedId
            """)
    int publishAllInserted(@Param("examId") Integer examId,
            @Param("insertedId") Integer insertedId,
            @Param("published") Status published);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
                update registrations r
                set r.result_id = case
                	when r.status_id = :rejectedId then :postponedId
                	else r.result_id
        		end,
        		r.status_id = :verbalizedId
        		where r.exam_id = :examId
        			and r.status_id in (:toBeVerbalizedIds)
        			and r.report_id is null
    		""", nativeQuery = true)
    int finalizeAll(
            @Param("examId") Integer examId,
            @Param("toBeVerbalizedIds") Set<Integer> toBeVerbalizedIds,
            @Param("verbalizedId") Integer verbalizedId,
            @Param("rejectedId") Integer rejectedId,
            @Param("postponedId") Integer postponedId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                update Registration r
                set r.report = :report
                where r.exam.id = :examId
                    and r.status.id = :verbalizedId
                    and r.report is null
            """)
    int updateReport(
            @Param("examId") Integer examId,
            @Param("verbalizedId") Integer verbalizedId,
            @Param("report") Report report);

    Optional<Registration> findByStudent_IdAndExam_Id(Integer studentId, Integer examId);
}
