package it.polimi.mypolihub_spa.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.Student;

public interface StudentRepository extends JpaRepository<Student, Integer> {
    
}
