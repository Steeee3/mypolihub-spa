package it.polimi.mypolihub_spa.DTO;

import it.polimi.mypolihub_spa.entity.DegreeLevel;

public class DegreeLevelDTO {
    private String name;
    private Integer yearsOfStudy;

    public DegreeLevelDTO(DegreeLevel degreeLevel) {
        name = degreeLevel.getName();
        yearsOfStudy = degreeLevel.getYearsOfStudy();
    }

    public String getName() {
        return name;
    }

    public Integer getYearsOfStudy() {
        return yearsOfStudy;
    }
}
