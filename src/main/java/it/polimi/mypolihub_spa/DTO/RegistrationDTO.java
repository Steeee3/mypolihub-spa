package it.polimi.mypolihub_spa.DTO;

import java.util.Set;

import it.polimi.mypolihub_spa.entity.Registration;

public class RegistrationDTO {
    private Integer id;
    private StudentDTO student;
    private String status;
    private ExamDTO exam;
    private ResultDTO result;

    private static final int STATUS_PUBBLICATO_ID = 3;
    private static final Set<Integer> TO_BE_DECLINED_STATUS_IDS = Set.of(
            STATUS_PUBBLICATO_ID);
    private final static int RESULT_18_ID = 5;
    private final boolean canBeDeclined;

    public RegistrationDTO(Registration registration) {
        id = registration.getId();
        student = new StudentDTO(registration.getStudent());
        status = registration.getStatus().getValue();

        exam = new ExamDTO(registration.getExam());
        result = new ResultDTO(registration.getResult());

        canBeDeclined = TO_BE_DECLINED_STATUS_IDS.contains(registration.getStatus().getId())
                && registration.getResult().getId() >= RESULT_18_ID;
    }

    public Integer getId() {
        return id;
    }

    public StudentDTO getStudent() {
        return student;
    }

    public String getStatus() {
        return status;
    }

    public ExamDTO getExam() {
        return exam;
    }

    public ResultDTO getResult() {
        return result;
    }

    public boolean canBeDeclined() {
        return canBeDeclined;
    }
}

