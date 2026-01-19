package it.polimi.mypolihub_spa.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import it.polimi.mypolihub_spa.DTO.RegistrationDTO;
import it.polimi.mypolihub_spa.entity.Role;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.ExamService;

@Controller
public class EsitoController {

	@Autowired
	private ExamService examService;

	@GetMapping("/student/result")
	public String result(
			@RequestParam(name = "examId", required = false) Integer examId,
			@AuthenticationPrincipal CustomUserDetails principal,
			Authentication auth,
			Model model) {
		Role role = Role.from(auth);

		if (examId == null) {
			return "redirect:/home";
		}

		try {
			RegistrationDTO registration = examService.getResultByStudentIdAndExamId(principal.getId(), examId);
			fillResultModel(registration, model);
		} catch (IllegalArgumentException e) {
			fillNotPublishedModel(e.getMessage(), model);
		}

		addCommonAttributes(principal, role, examId, model);

		return "result";
	}

	private void fillResultModel(RegistrationDTO registration, Model model) {
		model.addAttribute("registration", registration);
		model.addAttribute("notPublished", false);

		if (registration.canBeDeclined()) {
			model.addAttribute("canDecline", true);
		} else {
			model.addAttribute("canDecline", false);
		}
	}

	private void fillNotPublishedModel(String errorMessage, Model model) {
		model.addAttribute("errorMessage", errorMessage);
		model.addAttribute("notPublished", true);
	}

	private void addCommonAttributes(CustomUserDetails principal, Role role, Integer examId, Model model) {
		model.addAttribute("examId", examId);

		model.addAttribute("helloName", principal.getName());
		model.addAttribute("role", role);
	}

	@PostMapping("/student/result/{examId}/decline")
	public String declineResult(
			@PathVariable Integer examId,
			@AuthenticationPrincipal CustomUserDetails principal,
			RedirectAttributes ra) {

		try {
			examService.declineExamResult(principal.getId(), examId);
			ra.addFlashAttribute("successMessage", "Voto rifiutato con successo");
		} catch (IllegalArgumentException e) {
			ra.addFlashAttribute("errorMessage", e.getMessage());
		}

		ra.addAttribute("examId", examId);

		return "redirect:/student/result";
	}
}
