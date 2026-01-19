package it.polimi.mypolihub_spa.DTO;

import it.polimi.mypolihub_spa.entity.Student;
import it.polimi.mypolihub_spa.entity.User;

public class StudentDTO {
    private String name;
    private String surname;
    private String email;
    private Integer number;
    private MajorDTO major;

    public StudentDTO(Student student) {
        User userData = student.getUser();

        name = userData.getName();
        surname = userData.getSurname();
        email = userData.getEmail();

        number = student.getNumber();
        major = new MajorDTO(student.getMajor());
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

    public Integer getNumber() {
        return number;
    }

    public MajorDTO getMajor() {
        return major;
    }
}
