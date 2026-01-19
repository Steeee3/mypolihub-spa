package it.polimi.mypolihub_spa.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import it.polimi.mypolihub_spa.entity.Major;

public interface MajorRepository extends JpaRepository<Major, Integer> {
    boolean existsByNameIgnoreCase(String name);

    @Query("""
            select m
            from Major m
            join fetch m.degreeLevel
            order by m.name asc
            """)
    List<Major> findAllWithDegreeLevel();

    @Query(value = """
            SELECT *
            FROM majors
            WHERE id IN (:ids)
            ORDER BY FIELD(id, :ids)
            """, nativeQuery = true)
    List<Major> findAllByIdInOrder(@Param("ids") List<Integer> ids);
}
