INSERT IGNORE INTO courses_students (course_id, student_id)
SELECT 2, s.id
FROM students s
WHERE s.id BETWEEN 218 AND 267;

INSERT IGNORE INTO registrations (student_id, exam_id, status_id, result_id, report_id)
SELECT s.id, 2, 1, 1, NULL
FROM students s
WHERE s.id BETWEEN 100 AND 110;

corsi: tra 5 e 10
tra 3 e 202 ing info
tra 218 e 267 i 50 di magistrale info
tra 268 e 287 i 20 di magistrale telecom
tra 288 e 292 i 5 di musica
tra 293 e 302 i 10 di biomedica