package it.polimi.mypolihub_spa.utils;

import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Sort;

public class SortUtility {
    public record SortKey(String ui, String jpa) {
    }

    public static final String DEFAULT_SORT = "student.number";
    public static final String DEFAULT_DIR = "asc";

    public static final Set<String> ALLOWED_SORTS = Set.of(
            "student.number",
            "student.surname",
            "student.name",
            "student.email",
            "student.major",
            "result",
            "status");
    public static final Map<String, String> SORT_MAPPING = Map.of(
            "student.surname", "student.user.surname",
            "student.name", "student.user.name",
            "student.email", "student.user.email",
            "student.major", "student.major.name",
            "result", "result.id",
            "status", "status.id");

    public static SortKey getValidSortKeyFrom(String sort) {
        String ui = (sort == null || sort.isBlank()) ? DEFAULT_SORT : sort;
        if (!ALLOWED_SORTS.contains(ui)) {
            ui = DEFAULT_SORT;
        }
        String jpa = SORT_MAPPING.getOrDefault(ui, ui);
        
        return new SortKey(ui, jpa);
    }

    public static String getValidSortDirFrom(String sortDir) {
        if (sortDir == null || sortDir.isBlank()) {
            return DEFAULT_DIR;
        }
        return sortDir;
    }

    public static Sort toSort(String sortBy, String sortDir) {
		Sort.Direction direction = "desc".equalsIgnoreCase(sortDir)
				? Sort.Direction.DESC
				: Sort.Direction.ASC;

		return Sort.by(direction, sortBy);
	}
}
