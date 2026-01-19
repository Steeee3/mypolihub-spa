package it.polimi.mypolihub_spa.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.DegreeLevel;

public interface DegreeLevelRepository extends JpaRepository<DegreeLevel, Integer> {
    
}

