package it.polimi.mypolihub_spa.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.CourseMajor;

public interface CourseMajorRepository extends JpaRepository<CourseMajor, Integer> {
    
}
