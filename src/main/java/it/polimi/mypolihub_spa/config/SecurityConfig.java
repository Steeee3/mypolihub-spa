package it.polimi.mypolihub_spa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/login", "/css/**", "/js/**", "/img/**").permitAll()
            
            //SPA entrypoints
            .requestMatchers("/professor.html", "/app/professor/**").hasAnyRole("PROFESSOR", "ADMIN")
            .requestMatchers("/student.html", "/app/student/**").hasAnyRole("STUDENT", "ADMIN")

            //MVC entrypoints
            .requestMatchers("/admin/**").hasRole("ADMIN")

            //API: common
            .requestMatchers("/api/csrf").authenticated()
            .requestMatchers("/api/me").authenticated()
            .requestMatchers("/api/exams/**").authenticated()
            .requestMatchers("/api/results/valid-only").authenticated()

            //API: role based
            .requestMatchers("/api/professor/**").hasAnyRole("PROFESSOR", "ADMIN")
            .requestMatchers("/api/student/**").hasAnyRole("STUDENT", "ADMIN")

            //killswitch
            .requestMatchers("/api/**").denyAll()

            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginPage("/login")
            .loginProcessingUrl("/login")
            .defaultSuccessUrl("/", true)
            .failureUrl("/login?error")
            .permitAll()
        )
        .logout(logout -> logout
            .logoutUrl("/do-logout")
            .logoutSuccessUrl("/login?logout")
            .invalidateHttpSession(true)
            .deleteCookies("JSESSIONID")
            .permitAll()
        );

        return http.build();
    }
}
