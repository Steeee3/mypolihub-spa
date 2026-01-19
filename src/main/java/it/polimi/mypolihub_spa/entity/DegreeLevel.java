package it.polimi.mypolihub_spa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "degree_levels")
public class DegreeLevel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "yearsOfStudy", nullable = false)
    private Integer yearsOfStudy;

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getYearsOfStudy() {
        return yearsOfStudy;
    }

    public void setYearsOfStudy(Integer yearsOfStudy) {
        this.yearsOfStudy = yearsOfStudy;
    }
}
