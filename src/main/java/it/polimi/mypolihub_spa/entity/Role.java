package it.polimi.mypolihub_spa.entity;

import org.springframework.security.core.Authentication;

public enum Role {
    STUDENT,
    PROFESSOR,
    ADMIN;

    public static Role from(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .map(Role::valueOf)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No ROLE_* authority found"));
    }

    public boolean isStudent() { return this == STUDENT; }
    public boolean isProfessor() { return this == PROFESSOR; }
    public boolean isAdmin() { return this == ADMIN; }
}
