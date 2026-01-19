package it.polimi.mypolihub_spa.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import it.polimi.mypolihub_spa.entity.User;
import it.polimi.mypolihub_spa.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User u = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        List<SimpleGrantedAuthority> auths = List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name()));

        return new CustomUserDetails(u.getId(), u.getName(), u.getSurname(), u.getEmail(), u.getPassword(), auths);
    }
}
