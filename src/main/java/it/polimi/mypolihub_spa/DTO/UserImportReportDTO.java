package it.polimi.mypolihub_spa.DTO;

import java.util.ArrayList;
import java.util.List;

public class UserImportReportDTO {
    private int created;
    private int skipped;
    private final List<String> errors = new ArrayList<>();

    public int getCreated() { return created; }
    public int getSkipped() { return skipped; }
    public List<String> getErrors() { return errors; }

    public void incCreated() { created++; }
    public void incSkipped() { skipped++; }

    public void addError(String error) {
        errors.add(error);
    }
}
