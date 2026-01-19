package it.polimi.mypolihub_spa.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.polimi.mypolihub_spa.entity.Major;
import it.polimi.mypolihub_spa.entity.Student;
import it.polimi.mypolihub_spa.entity.User;
import it.polimi.mypolihub_spa.repository.StudentRepository;
import it.polimi.mypolihub_spa.repository.UserRepository;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Transactional
    public void createStudent(User user, Major major) {
        userRepository.save(user);

        Student student = new Student();
        student.setUser(user);
        student.setMajor(major);
        studentRepository.save(student);
    }
}