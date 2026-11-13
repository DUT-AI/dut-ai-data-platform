from collections.abc import Iterable
from dataclasses import asdict

from core.exceptions import BadRequestException
from modules.annotation.domain.result_validation import AnnotationIssue


class AnnotationValidationError(BadRequestException):
    """Annotation results violate the Ontology Version contract (HTTP 400).

    All issues are exposed to clients under ``error.details.issues``.
    """

    def __init__(self, issues: Iterable[AnnotationIssue]) -> None:
        self.issues = list(issues)
        first = self.issues[0].message if self.issues else ""
        super().__init__(
            "Kết quả gán nhãn không khớp Ontology Version "
            f"({len(self.issues)} lỗi). {first}".strip(),
            details={"issues": [asdict(issue) for issue in self.issues]},
        )
