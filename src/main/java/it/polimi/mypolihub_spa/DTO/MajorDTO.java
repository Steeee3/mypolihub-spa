package it.polimi.mypolihub_spa.DTO;

import it.polimi.mypolihub_spa.entity.Major;

public class MajorDTO {
    private Integer id;
    private String name;
    private DegreeLevelDTO degreeLevel;

    public MajorDTO(Major major) {
        id = major.getId();
        name = major.getName();
        degreeLevel = new DegreeLevelDTO(major.getDegreeLevel());
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public DegreeLevelDTO getDegreeLevel() {
        return degreeLevel;
    }
}