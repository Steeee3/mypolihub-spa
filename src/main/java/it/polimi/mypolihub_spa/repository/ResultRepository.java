package it.polimi.mypolihub_spa.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.Result;

public interface ResultRepository extends JpaRepository<Result, Integer> {
    List<Result> findAllByOrderByIdAsc();
}
