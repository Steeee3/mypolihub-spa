package it.polimi.mypolihub_spa.DTO;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import it.polimi.mypolihub_spa.entity.Registration;
import it.polimi.mypolihub_spa.entity.Report;

public class ReportDTO {
    private Integer id;
    private ExamDTO exam;
    private Instant timestamp;
    private List<RegistrationDTO> registrations = new ArrayList<>();

    public ReportDTO(Report report, List<Registration> registrations) {
        id = report.getId();
        exam = new ExamDTO(report.getExam());
        timestamp = report.getTimestamp();

        for (Registration registration : registrations) {
            RegistrationDTO registrationDTO = new RegistrationDTO(registration);

            this.registrations.add(registrationDTO);
        }
    }

    public Integer getId() {
        return id;
    }

    public ExamDTO getExam() {
        return exam;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public List<RegistrationDTO> getRegistrations() {
        return registrations;
    }
}
