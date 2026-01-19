package it.polimi.mypolihub_spa.service;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.polimi.mypolihub_spa.DTO.ReportDTO;
import it.polimi.mypolihub_spa.entity.Exam;
import it.polimi.mypolihub_spa.entity.Registration;
import it.polimi.mypolihub_spa.entity.Report;
import it.polimi.mypolihub_spa.repository.RegistrationRepository;
import it.polimi.mypolihub_spa.repository.ReportRepository;
import it.polimi.mypolihub_spa.utils.SortUtility;

@Service
public class ReportService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private RegistrationRepository registrationRepository;

    // -----------------------------
    // Report creation
    // -----------------------------

    @Transactional
    public Report createReport(Exam exam) {
        assertExamProvided(exam);

        Report report = new Report();
        report.setExam(exam);
        report.setTimestamp(Instant.now());

        reportRepository.save(report);

        return report;
    }

    // -----------------------------
    // Report visualization (single)
    // -----------------------------

    @Transactional(readOnly = true)
    public ReportDTO getReportByIdSortedBy(
            Integer professorId,
            Integer reportId,
            String sortBy,
            String sortDir) {

        assertProfessorOwnsReport(professorId, reportId);

        Sort sort = SortUtility.toSort(sortBy, sortDir);

        Report report = getReport(reportId);
        List<Registration> registrations = registrationRepository.findByReport_Id(reportId, sort);

        return new ReportDTO(report, registrations);
    }

    // -----------------------------
    // Reports listing (by course)
    // -----------------------------

    @Transactional(readOnly = true)
    public List<ReportDTO> getReportsForCourse(Integer professorId, Integer courseId) {
        return reportRepository
                .findAllByExam_Course_IdAndExam_Course_Professor_IdOrderByExam_DateAsc(courseId, professorId)
                .stream()
                .map(r -> new ReportDTO(r, List.of()))
                .toList();
    }

    // -----------------------------
    // Helpers: validation / access control
    // -----------------------------

    private void assertExamProvided(Exam exam) {
        if (exam == null) {
            throw new IllegalArgumentException("Exam must exist");
        }
    }

    private void assertProfessorOwnsReport(Integer professorId, Integer reportId) {
        boolean allowed = reportRepository.existsByIdAndExam_Course_Professor_Id(reportId, professorId);
        if (!allowed) {
            throw new AccessDeniedException("Assicurati di essere il docente associato al corso.");
        }
    }

    // -----------------------------
    // Helpers: getters
    // -----------------------------

    private Report getReport(Integer reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Il verbale fornito non esiste"));
    }
}
