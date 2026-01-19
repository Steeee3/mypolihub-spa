package it.polimi.mypolihub_spa.DTO;

import it.polimi.mypolihub_spa.entity.Major;

public class MajorDTO {
    private String name;
    private DegreeLevelDTO degreeLevel;

    public MajorDTO(Major major) {
        name = major.getName();
        degreeLevel = new DegreeLevelDTO(major.getDegreeLevel());
    }

    public String getName() {
        return name;
    }

    public DegreeLevelDTO getDegreeLevel() {
        return degreeLevel;
    }
}