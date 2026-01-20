package it.polimi.mypolihub_spa.controller.api;

import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import it.polimi.mypolihub_spa.entity.Role;
import it.polimi.mypolihub_spa.security.CustomUserDetails;

@RestController
public class MeApiController {

    @GetMapping("/api/me")
    public Map<String, Object> me(
            @AuthenticationPrincipal CustomUserDetails principal,
            Authentication auth) {

        Role role = Role.from(auth);

        return Map.of(
                "id", principal.getId(),
                "name", principal.getName(),
                "role", role.name()
        );
    }
}
