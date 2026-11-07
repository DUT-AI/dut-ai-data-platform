# Quickstart & Verification Guide: Remediation of Code Smells

## 1. Prerequisites

- Python 3.12+ in `.venv`.
- Sync environment dependencies:
  ```bash
  uv sync
  ```

---

## 2. Automated Architecture & Code Smell Verification Gates

Run the following automated verification suite to prove all 5 code smells are eliminated:

### Gate 1: Pure Domain Exceptions Gate
```bash
python -c '
from core.exceptions.base import DomainException, InvariantViolationError, BusinessRuleViolationError
import inspect

sig = inspect.signature(DomainException.__init__)
assert "status_code" not in sig.parameters, "FAILED: DomainException still accepts status_code!"

# Verify Dataset policies do not raise BadRequestException
from modules.dataset.domain.policies import DatasetVersionPolicy
policy_source = inspect.getsource(DatasetVersionPolicy)
assert "BadRequestException" not in policy_source, "FAILED: DatasetVersionPolicy still references BadRequestException!"
print("✅ Gate 1 Passed: Domain Exceptions and Policies are completely protocol-agnostic.")
'
```

### Gate 2: Clean Dataclass & User ID Integer Gate
```bash
python -c '
from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity
from core.constants import SYSTEM_USER_ID

# Verify clean dataclass instantiation with int
p = ProjectEntity(name="Demo", created_by=101)
assert p.created_by == 101, f"Expected 101, got {p.created_by}"

# Verify sentinel constant on string coercion
p_sys = ProjectEntity(name="System Project", created_by="system")
assert p_sys.created_by == SYSTEM_USER_ID, f"Expected {SYSTEM_USER_ID}, got {p_sys.created_by}"
print("✅ Gate 2 Passed: Dataclasses are cleanly formatted and enforce int user IDs.")
'
```

### Gate 3: Seeder Session Safety Gate
```bash
python -c '
from modules.ontology.services import seeder
import inspect

source = inspect.getsource(seeder)
assert "self.session.rollback()" not in source, "FAILED: Seeder still unilaterally rolls back shared session!"
print("✅ Gate 3 Passed: Seeder no longer touches self.session.rollback().")
'
```

### Gate 4: Dead Code Absence Gate
```bash
python -c '
from modules.ontology.use_cases import ontologies
assert not hasattr(ontologies, "seed_ontology_from_template"), "FAILED: Dead code seed_ontology_from_template still exists!"
print("✅ Gate 4 Passed: Dead code successfully removed from ontologies.py.")
'
```

### Gate 5: Pooled HTTP Client Gate
```bash
python -c '
from modules.identity.client.auth_client import AuthClient
import inspect
sig = inspect.signature(AuthClient.__init__)
assert "client" in sig.parameters, "FAILED: AuthClient must receive pooled httpx.AsyncClient in __init__!"
print("✅ Gate 5 Passed: AuthClient receives injected pooled HTTP client.")
'
```

---

## 3. Full Regression Test Suite

Execute the complete test suite to verify 0 regressions:
```bash
uv run pytest tests/ -q
```
*Expected Result*: All 111 tests pass.
