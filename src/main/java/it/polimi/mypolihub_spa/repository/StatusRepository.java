package it.polimi.mypolihub_spa.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.Status;

public interface StatusRepository extends JpaRepository<Status, Integer>{
    
}
