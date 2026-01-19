package it.polimi.mypolihub_spa.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import it.polimi.mypolihub_spa.entity.User;

public interface UserRepository extends JpaRepository<User, Integer> {
    long countBy();
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
