package it.polimi.mypolihub_spa.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import it.polimi.mypolihub_spa.DTO.UserImportReportDTO;
import it.polimi.mypolihub_spa.entity.Major;
import it.polimi.mypolihub_spa.entity.Professor;
import it.polimi.mypolihub_spa.entity.Role;
import it.polimi.mypolihub_spa.entity.Student;
import it.polimi.mypolihub_spa.entity.User;
import it.polimi.mypolihub_spa.repository.MajorRepository;
import it.polimi.mypolihub_spa.repository.ProfessorRepository;
import it.polimi.mypolihub_spa.repository.StudentRepository;
import it.polimi.mypolihub_spa.repository.UserRepository;

@Service
public class UserCreatorService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MajorRepository majorRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    private record Name(String name, String surname) {
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public UserImportReportDTO importUsersFromUpload(MultipartFile file, Role role, String defaultPassword,
            Integer majorId) {
        try (BufferedReader br = bufferedReaderOfFile(file)) {

            return insertUsersWithSameRoleAndDefaultPassword(br, role, defaultPassword, majorId);

        } catch (IOException e) {
            throw new RuntimeException("Upload file error", e);
        }
    }

    private BufferedReader bufferedReaderOfFile(MultipartFile file) throws IOException {
        return new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
    }

    private UserImportReportDTO insertUsersWithSameRoleAndDefaultPassword(BufferedReader br, Role role,
            String defaultPassword, Integer majorId) throws IOException {
        UserImportReportDTO report = new UserImportReportDTO();

        Major major = null;
        try {
            major = getMajorIfStudent(role, majorId);
        } catch (IllegalArgumentException e) {
            report.incSkipped();
            report.addError(e.getMessage());

            return report;
        }

        String readName;
        while ((readName = br.readLine()) != null) {
            readName = readName.trim();

            if (readName.isBlank()) {
                report.incSkipped();
                continue;
            }

            Name fullName = getNameFromRawName(readName);
            if (fullName == null) {
                report.incSkipped();
                continue;
            }

            User user = buildUser(fullName.name, fullName.surname, role, defaultPassword);

            try {
                insertUserIntoDB(user, role, major);
                report.incCreated();

            } catch (IllegalArgumentException e) {
                report.incSkipped();
                report.addError("Error on '" + readName + "': " + e.getMessage());
            }
        }

        return report;
    }

    private Major getMajorIfStudent(Role role, Integer majorId) {
        Major major = null;

        if (role == Role.STUDENT) {
            if (majorId == null) {
                throw new IllegalArgumentException("Major not valid (cannot be null)");
            }
            major = majorRepository.findById(majorId)
                    .orElseThrow(() -> new IllegalArgumentException("Major not found: " + majorId));
        }

        return major;
    }

    private Name getNameFromRawName(String rawName) {
        try {
            List<String> nameAndSurname = getNameAndSurnameFromFullName(rawName);

            return new Name(nameAndSurname.getFirst(), nameAndSurname.getLast());

        } catch (IllegalArgumentException e) {
            System.err.println(e.getMessage());

            return null;
        }
    }

    private List<String> getNameAndSurnameFromFullName(String fullName) {
        int firstSpace = fullName.indexOf(" ");

        if (firstSpace == -1) {
            throw new IllegalArgumentException("Name and surname must be separated with a space: " + fullName);
        }

        String name = fullName.substring(0, firstSpace);
        name = capitalizeAndSanify(name);

        String surname = fullName.substring(firstSpace + 1);
        surname = capitalizeAndSanify(surname);

        return List.of(name, surname);
    }

    private String capitalizeAndSanify(String word) {
        word = word.trim().replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);

        if (word.isEmpty()) {
            return word;
        }

        int spaceIndex = word.indexOf(" ");
        while (spaceIndex != -1) {
            char c = word.charAt(spaceIndex + 1);

            c = Character.toUpperCase(c);
            word = word.substring(0, spaceIndex + 1) + c + word.substring(spaceIndex + 2);

            spaceIndex = word.indexOf(" ", spaceIndex + 1);
        }

        char firstLetter = word.charAt(0);
        firstLetter = Character.toUpperCase(firstLetter);
        word = firstLetter + word.substring(1);

        return word;
    }

    private User buildUser(String name, String surname, Role role, String password) {
        User u = new User();

        u.setName(name);
        u.setSurname(surname);
        u.setEmail(createUniqueEmail(name + " " + surname));
        u.setPassword(passwordEncoder.encode(password));
        u.setRole(role);

        return u;
    }

    private String createUniqueEmail(String fullName) {
        String base = fullName
                .toLowerCase()
                .replace(" ", ".");
        String domain = "@mail.polimi.it";
        String email = base + domain;

        int i = 2;
        while ((userRepository.existsByEmail(email))) {
            email = base + i + domain;
            i++;
        }
        return email;
    }

    private void insertUserIntoDB(User user, Role role, Major major) {
        switch (role) {
            case STUDENT -> saveStudent(user, major);
            case PROFESSOR -> saveProfessor(user);
            case ADMIN -> saveAdmin(user);
        }
    }

    private void saveStudent(User user, Major major) {
        userRepository.save(user);

        Student student = new Student();
        student.setUser(user);
        student.setMajor(major);
        studentRepository.save(student);
    }

    private void saveProfessor(User user) {
        userRepository.save(user);

        Professor professor = new Professor();
        professor.setUser(user);
        professorRepository.save(professor);
    }

    private void saveAdmin(User user) {
        userRepository.save(user);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public UserImportReportDTO createSingleUser(Role role, String name, String surname, String defaultPassword,
            Integer majorId) {
        UserImportReportDTO report = new UserImportReportDTO();

        Major major = null;
        try {
            major = getMajorIfStudent(role, majorId);
        } catch (IllegalArgumentException e) {
            report.incSkipped();
            report.addError(e.getMessage());

            return report;
        }

        String insertedName = name + " " + surname;
        insertedName = insertedName.trim();

        if (insertedName.isBlank()) {
            report.incSkipped();
            return report;
        }

        Name fullName = getNameFromRawName(insertedName);
        if (fullName == null) {
            report.incSkipped();
            return report;
        }

        User user = buildUser(fullName.name, fullName.surname, role, defaultPassword);

        try {
            insertUserIntoDB(user, role, major);
            report.incCreated();

        } catch (IllegalArgumentException e) {
            report.incSkipped();
            report.addError("Error on '" + insertedName + "': " + e.getMessage());
        }

        return report;
    }
}
