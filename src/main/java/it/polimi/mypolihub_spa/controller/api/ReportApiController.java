package it.polimi.mypolihub_spa.controller.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import it.polimi.mypolihub_spa.DTO.ReportDTO;
import it.polimi.mypolihub_spa.security.CustomUserDetails;
import it.polimi.mypolihub_spa.service.ReportService;
import it.polimi.mypolihub_spa.utils.SortUtility;
import it.polimi.mypolihub_spa.utils.SortUtility.SortKey;

@RestController
@RequestMapping("/api")
public class ReportApiController {

    @Autowired
    private ReportService reportService;

    // -----------------------------
	// Professor operations
	// -----------------------------
    
    @GetMapping("/professor/reports")
    public List<ReportDTO> getAllReportsByCourseId(@RequestParam Integer courseId, @AuthenticationPrincipal CustomUserDetails principal) {
        return reportService.getReportsForCourse(principal.getId(), courseId);
    }

    @GetMapping("/professor/report")
    public ReportDTO getReportById(@RequestParam Integer reportId, @AuthenticationPrincipal CustomUserDetails principal) {
        SortKey sortKey = SortUtility.getValidSortKeyFrom(SortUtility.DEFAULT_SORT);
        String sortDir = SortUtility.getValidSortDirFrom(SortUtility.DEFAULT_DIR);

        return reportService.getReportByIdSortedBy(principal.getId(), reportId, sortKey.jpa(), sortDir);
    }
}
