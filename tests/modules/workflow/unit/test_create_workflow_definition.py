import unittest
from datetime import datetime, timezone
from modules.workflow.application.dtos.workflow_dtos import CreateWorkflowDefinitionRequest
from modules.workflow.application.use_cases.create_workflow_definition import CreateWorkflowDefinitionUseCase
from modules.workflow.domain.entities.workflow import WorkflowDefinitionEntity


class InMemoryWorkflowDefinitionRepository:
    def __init__(self):
        self.definitions = {}

    async def create(self, definition: WorkflowDefinitionEntity) -> WorkflowDefinitionEntity:
        self.definitions[definition.id] = definition
        return definition

    async def get_by_id(self, workflow_id: str):
        return self.definitions.get(workflow_id)

    async def get_by_project_id(self, project_id: str):
        for d in self.definitions.values():
            if d.project_id == project_id:
                return d
        return None


class TestCreateWorkflowDefinition(unittest.IsolatedAsyncioTestCase):
    async def test_create_workflow_definition_success(self):
        repo = InMemoryWorkflowDefinitionRepository()
        use_case = CreateWorkflowDefinitionUseCase(repo)

        req = CreateWorkflowDefinitionRequest(
            project_id="proj_123",
            name="Annotation Flow",
            description="Test flow",
            config={"max_iterations": 3},
        )
        response = await use_case.execute(req)

        self.assertIsNotNone(response.id)
        self.assertEqual(response.project_id, "proj_123")
        self.assertEqual(response.name, "Annotation Flow")
        self.assertEqual(response.config["max_iterations"], 3)


if __name__ == "__main__":
    unittest.main()
