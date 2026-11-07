import unittest
from modules.workflow.application.dtos.workflow_dtos import CreateBatchWorkItemsRequest, BatchItemSpec
from modules.workflow.application.use_cases.create_batch_work_items import CreateBatchWorkItemsUseCase
from modules.workflow.domain.entities.workflow import WorkflowDefinitionEntity, WorkItemEntity, WorkItemStatus
from modules.workflow.domain.exceptions.workflow_exceptions import WorkflowDefinitionNotFoundError


class InMemoryWorkItemRepo:
    def __init__(self):
        self.items = []

    async def create(self, item: WorkItemEntity):
        self.items.append(item)
        return item

    async def create_batch(self, items: list[WorkItemEntity]):
        self.items.extend(items)
        return items

    async def get_by_id(self, item_id: str):
        return None

    async def get_by_id_for_update(self, item_id: str):
        return None

    async def list_by_filter(self, *args, **kwargs):
        return self.items, len(self.items)

    async def update(self, item: WorkItemEntity):
        return item


class InMemoryWorkflowRepo:
    def __init__(self):
        self.wf = None

    async def create(self, definition):
        return definition

    async def get_by_id(self, workflow_id: str):
        return self.wf

    async def get_by_project_id(self, project_id: str):
        return self.wf


class TestCreateBatchWorkItems(unittest.IsolatedAsyncioTestCase):
    async def test_create_batch_work_items_success(self):
        wf_repo = InMemoryWorkflowRepo()
        wf_repo.wf = WorkflowDefinitionEntity(id="wf_01", project_id="proj_01", name="WF")
        item_repo = InMemoryWorkItemRepo()

        use_case = CreateBatchWorkItemsUseCase(item_repo, wf_repo)

        req = CreateBatchWorkItemsRequest(
            workflow_id="wf_01",
            project_id="proj_01",
            resource_type="ANNOTATION_BATCH",
            batches=[
                BatchItemSpec(batch_id="b1", asset_ids=["a1", "a2"]),
                BatchItemSpec(batch_id="b2", asset_ids=["a3", "a4", "a5"]),
            ],
        )

        res = await use_case.execute(req)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0].status, WorkItemStatus.CREATED)
        self.assertEqual(res[0].resource_id, "b1")
        self.assertEqual(res[0].metadata["item_count"], 2)
        self.assertEqual(res[1].metadata["item_count"], 3)

    async def test_create_batch_missing_workflow_raises(self):
        wf_repo = InMemoryWorkflowRepo()
        item_repo = InMemoryWorkItemRepo()
        use_case = CreateBatchWorkItemsUseCase(item_repo, wf_repo)

        req = CreateBatchWorkItemsRequest(
            workflow_id="missing_wf",
            project_id="proj_01",
            batches=[BatchItemSpec(batch_id="b1", asset_ids=["a1"])],
        )
        with self.assertRaises(WorkflowDefinitionNotFoundError):
            await use_case.execute(req)

