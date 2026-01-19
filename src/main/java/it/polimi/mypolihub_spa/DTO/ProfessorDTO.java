package it.polimi.mypolihub_spa.DTO;

import it.polimi.mypolihub_spa.entity.Professor;
import it.polimi.mypolihub_spa.entity.User;

public class ProfessorDTO {
    private String name;
    private String surname;
    private String email;

    public ProfessorDTO(Professor professor) {
        User userData = professor.getUser();

        name = userData.getName();
        surname = userData.getSurname();
        email = userData.getEmail();
    }

    public String getName() {
        return name;
    }

    public String getSurname() {
        return surname;
    }

    public String getEmail() {
        return email;
    }
}
