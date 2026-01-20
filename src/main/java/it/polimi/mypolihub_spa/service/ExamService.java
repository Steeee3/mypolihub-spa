package it.polimi.mypolihub_spa.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.polimi.mypolihub_spa.DTO.BulkResultUpdateDTO;
import it.polimi.mypolihub_spa.DTO.ExamDTO;
import it.polimi.mypolihub_spa.DTO.RegistrationDTO;
import it.polimi.mypolihub_spa.entity.Course;
import it.polimi.mypolihub_spa.entity.DefaultValues;
import it.polimi.mypolihub_spa.entity.Exam;
import it.polimi.mypolihub_spa.entity.Registration;
import it.polimi.mypolihub_spa.entity.Report;
import it.polimi.mypolihub_spa.entity.Result;
import it.polimi.mypolihub_spa.entity.Status;
import it.polimi.mypolihub_spa.entity.Student;
import it.polimi.mypolihub_spa.repository.CourseRepository;
import it.polimi.mypolihub_spa.repository.ExamRepository;
import it.polimi.mypolihub_spa.repository.RegistrationRepository;
import it.polimi.mypolihub_spa.repository.ResultRepository;
import it.polimi.mypolihub_spa.repository.StatusRepository;
import it.polimi.mypolihub_spa.repository.StudentRepository;
import it.polimi.mypolihub_spa.utils.SortUtility;

@Service
public class ExamService {

	@Autowired
	private ReportService reportService;

	@Autowired
	private ExamRepository examRepository;

	@Autowired
	private CourseRepository courseRepository;

	@Autowired
	private RegistrationRepository registrationRepository;

	@Autowired
	private ResultRepository resultRepository;

	@Autowired
	private StatusRepository statusRepository;

	@Autowired
	private StudentRepository studentRepository;

	private static final Set<Integer> EDITABLE_STATUS_IDS = Set.of(
			DefaultValues.STATUS_NON_INSERITO_ID,
			DefaultValues.STATUS_INSERITO_ID);

	private static final Set<Integer> TO_BE_VERBALIZED_STATUS_IDS = Set.of(
			DefaultValues.STATUS_PUBBLICATO_ID,
			DefaultValues.STATUS_RIFIUTATO_ID);

	private static final Set<Integer> TO_BE_DECLINED_STATUS_IDS = Set.of(
			DefaultValues.STATUS_PUBBLICATO_ID);

	private static final Set<Integer> TO_BE_VISUALIZED_STATUS_IDS = Set.of(
			DefaultValues.STATUS_PUBBLICATO_ID,
			DefaultValues.STATUS_RIFIUTATO_ID,
			DefaultValues.STATUS_VERBALIZZATO_ID);

	// -----------------------------
	// Exam calls
	// -----------------------------

	@Transactional
	public void addExamCall(Integer courseId, LocalDateTime date) {
		Course course = getCourse(courseId);

		Exam exam = new Exam();
		exam.setCourse(course);
		exam.setDate(date);

		examRepository.save(exam);
	}

	@Transactional(readOnly = true)
	public List<ExamDTO> getExamsForCourse(Integer courseId) {
		return examRepository.findAllByCourse_IdOrderByDateDesc(courseId).stream()
				.map(ExamDTO::new)
				.toList();
	}

	// -----------------------------
	// Student registrations
	// -----------------------------

	@Transactional(readOnly = true)
	public Set<Integer> getRegisteredExamIds(Integer studentId, Integer courseId) {
		return registrationRepository.findRegisteredExamIdsByStudentAndCourse(studentId, courseId);
	}

	@Transactional
	public void registerStudentForExam(Integer studentId, Integer examId) {
		Student student = getStudent(studentId);
		Exam exam = getExam(examId);

		assertStudentEnrolledInExamCourse(studentId, examId);
		assertStudentNotAlreadyRegisteredForExamCall(studentId, examId);

		Registration registration = new Registration();
		registration.setStudent(student);
		registration.setExam(exam);
		registration.setResult(getResult(DefaultValues.RESULT_VUOTO_ID));
		registration.setStatus(getStatus(DefaultValues.STATUS_NON_INSERITO_ID));

		registrationRepository.save(registration);
	}

	@Transactional(readOnly = true)
	public RegistrationDTO getResultByStudentIdAndExamId(Integer studentId, Integer examId) {
		Registration registration = getRegistrationByStudentId(studentId, examId);
		assertVisibleToStudent(registration);
		return new RegistrationDTO(registration);
	}

	@Transactional
	public void declineExamResult(Integer studentId, Integer examId) {
		Registration registration = getRegistrationByStudentId(studentId, examId);

		assertDeclinable(registration);

		registration.setStatus(getStatus(DefaultValues.STATUS_RIFIUTATO_ID));
	}

	// -----------------------------
	// Professor operations
	// -----------------------------

	@Transactional(readOnly = true)
	public List<RegistrationDTO> getStudentsByExamIdSortedBy(
			Integer professorId,
			Integer examId,
			String sortBy,
			String sortDir) {

		assertProfessorOwnsExam(professorId, examId);

		Sort sort = SortUtility.toSort(sortBy, sortDir);

		return registrationRepository.findByExam_Id(examId, sort).stream()
				.map(RegistrationDTO::new)
				.toList();
	}

	@Transactional(readOnly = true)
	public RegistrationDTO getRegistrationById(Integer professorId, Integer registrationId) {
		Registration registration = getRegistration(registrationId);

		assertProfessorOwnsRegistration(professorId, registrationId);

		return new RegistrationDTO(registration);
	}

	@Transactional(readOnly = true)
	public List<RegistrationDTO> getAllRegistrationsById(Integer professorId, List<Integer> registrationids) {
		List<RegistrationDTO> registrations = new ArrayList<>();

		for (Integer id : registrationids) {
			RegistrationDTO registration = getRegistrationById(professorId, id);

			registrations.add(registration);
		}

		return registrations;
	}

	@Transactional
	public void setResult(Integer professorId, Integer registrationId, Integer resultId) {
		Registration registration = getRegistration(registrationId);

		assertProfessorOwnsRegistration(professorId, registrationId);
		assertEditable(registration);

		promoteStatusToInsertedIfNeeded(registration);

		registration.setResult(getResult(resultId));
	}

	@Transactional
	public void setResultBulk(Integer professorId, List<BulkResultUpdateDTO> updates) {
		for (BulkResultUpdateDTO update : updates) {
			int registrationId = update.registrationId();
			int resultId = update.resultId();

			setResult(professorId, registrationId, resultId);
		}
	}

	@Transactional
	public void publishResults(Integer professorId, Integer examId) {
		assertProfessorOwnsExam(professorId, examId);

		Status published = getStatus(DefaultValues.STATUS_PUBBLICATO_ID);

		int rows = registrationRepository.publishAllInserted(examId, DefaultValues.STATUS_INSERITO_ID, published);
		if (rows == 0) {
			throw new IllegalArgumentException("Nessun appello da pubblicare");
		}
	}

	@Transactional
	public Integer finalizeResults(Integer professorId, Integer examId) {
		assertProfessorOwnsExam(professorId, examId);

		getStatus(DefaultValues.STATUS_VERBALIZZATO_ID);
		getResult(DefaultValues.RESULT_RIMANDATO_ID);

		int finalized = registrationRepository.finalizeAll(
				examId,
				TO_BE_VERBALIZED_STATUS_IDS,
				DefaultValues.STATUS_VERBALIZZATO_ID,
				DefaultValues.STATUS_RIFIUTATO_ID,
				DefaultValues.RESULT_RIMANDATO_ID);

		if (finalized == 0) {
			throw new IllegalArgumentException("Nessun appello da verbalizzare");
		}

		Report report = reportService.createReport(getExam(examId));

		registrationRepository.updateReport(examId, DefaultValues.STATUS_VERBALIZZATO_ID, report);

		return report.getId();
	}

	// -----------------------------
	// Helpers: getters
	// -----------------------------

	private Course getCourse(Integer courseId) {
		return courseRepository.findById(courseId)
				.orElseThrow(() -> new IllegalArgumentException("Il corso fornito non esiste"));
	}

	private Student getStudent(Integer studentId) {
		return studentRepository.findById(studentId)
				.orElseThrow(() -> new IllegalArgumentException("Lo studente fornito non esiste"));
	}

	private Exam getExam(Integer examId) {
		return examRepository.findById(examId)
				.orElseThrow(() -> new IllegalArgumentException("L'esame specificato non esiste"));
	}

	private Registration getRegistration(Integer registrationId) {
		return registrationRepository.findById(registrationId)
				.orElseThrow(() -> new IllegalArgumentException("L'appello fornito non esiste"));
	}

	private Registration getRegistrationByStudentId(Integer studentId, Integer examId) {
		return registrationRepository.findByStudent_IdAndExam_Id(studentId, examId)
				.orElseThrow(() -> new IllegalArgumentException("Nessuna iscrizione trovata per l'utente fornito"));
	}

	private Status getStatus(int statusId) {
		return statusRepository.findById(statusId)
				.orElseThrow(() -> new IllegalStateException("Database missing status id=" + statusId));
	}

	private Result getResult(Integer resultId) {
		return resultRepository.findById(resultId)
				.orElseThrow(() -> new IllegalArgumentException("Il voto specificato non esiste"));
	}

	// -----------------------------
	// Helpers: access control
	// -----------------------------

	private void assertProfessorOwnsExam(Integer professorId, Integer examId) {
		if (!examRepository.existsByIdAndCourse_Professor_Id(examId, professorId)) {
			throw new AccessDeniedException("Assicurati di essere il docente associato al corso");
		}
	}

	private void assertProfessorOwnsRegistration(Integer professorId, Integer registrationId) {
		if (!registrationRepository.existsByIdAndExam_Course_Professor_Id(registrationId, professorId)) {
			throw new AccessDeniedException("Assicurati di essere il docente associato al corso");
		}
	}

	private void assertStudentEnrolledInExamCourse(Integer studentId, Integer examId) {
		if (!examRepository.existsByIdAndCourse_Students_Id(examId, studentId)) {
			throw new AccessDeniedException("Devi essere iscritto al corso per iscriverti ad un appello");
		}
	}

	private void assertStudentNotAlreadyRegisteredForExamCall(Integer studentId, Integer examId) {
		if (registrationRepository.existsByStudent_IdAndExam_Id(studentId, examId)) {
			throw new IllegalArgumentException("Sei già iscritto a questo appello");
		}
	}

	// -----------------------------
	// Helpers: domain rules
	// -----------------------------

	private void assertEditable(Registration registration) {
		int statusId = registration.getStatus().getId();
		if (!EDITABLE_STATUS_IDS.contains(statusId)) {
			throw new IllegalArgumentException("Non puoi modificare un appello " + registration.getStatus().getValue());
		}
	}

	private void promoteStatusToInsertedIfNeeded(Registration registration) {
		if (registration.getStatus().getId() != DefaultValues.STATUS_NON_INSERITO_ID) {
			return;
		}
		registration.setStatus(getStatus(DefaultValues.STATUS_INSERITO_ID));
	}

	private void assertVisibleToStudent(Registration registration) {
		if (!TO_BE_VISUALIZED_STATUS_IDS.contains(registration.getStatus().getId())) {
			throw new IllegalArgumentException("Il voto non è ancora stato pubblicato");
		}
	}

	private void assertDeclinable(Registration registration) {
		if (!TO_BE_DECLINED_STATUS_IDS.contains(registration.getStatus().getId())) {
			throw new IllegalArgumentException("Non puoi rifiutare questo voto");
		}

		Integer resultId = registration.getResult() == null ? null : registration.getResult().getId();
		if (resultId == null || resultId < DefaultValues.RESULT_18_ID) {
			throw new IllegalArgumentException("Non puoi rifiutare questo voto");
		}
	}
}
