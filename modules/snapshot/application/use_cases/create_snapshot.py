from core.uow import IUnitOfWork
from core.utils.id_generator import generate_ulid
from modules.snapshot.application.dtos.snapshot_dtos import SnapshotCreateRequest
from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.exceptions import SnapshotVersionConflictError
from modules.snapshot.domain.interfaces import SnapshotJobLauncher, SnapshotRepository
from modules.snapshot.domain.value_objects import (
    SnapshotStatus,
    SplitRatios,
)


class CreateSnapshotUseCase:
    def __init__(
        self,
        snapshot_repo: SnapshotRepository,
        uow: IUnitOfWork,
        launcher: SnapshotJobLauncher,
    ) -> None:
        self._snapshot_repo = snapshot_repo
        self._uow = uow
        self._launcher = launcher

    async def execute(
        self,
        project_id: str,
        request: SnapshotCreateRequest,
        user_id: int,
    ) -> SnapshotEntity:
        # 1. Resolve or auto-generate version name
        version_name = request.version_name
        if not version_name:
            count = await self._snapshot_repo.count_by_project(project_id)
            version_name = f"v{count + 1}"
        else:
            existing = await self._snapshot_repo.get_by_project_and_version(
                project_id=project_id, version_name=version_name
            )
            if existing:
                raise SnapshotVersionConflictError(
                    f"Snapshot version '{version_name}' already exists in project '{project_id}'."
                )

        # 2. Build SplitRatios domain value object
        ratios = SplitRatios(
            train=request.split_ratios.train,
            validation=request.split_ratios.validation,
            test=request.split_ratios.test,
        )

        # 3. Create initial Snapshot aggregate in CREATING status
        snapshot = SnapshotEntity(
            id=generate_ulid(),
            project_id=project_id,
            dataset_version_id=request.dataset_version_id,
            ontology_version_id=request.ontology_version_id,
            version_name=version_name,
            status=SnapshotStatus.CREATING,
            selection_policy=request.selection_policy,
            include_unannotated=request.include_unannotated,
            split_strategy=request.split_strategy,
            split_ratios=ratios,
            created_by=user_id,
            split_seed=request.split_seed,
        )

        persisted_snapshot = await self._snapshot_repo.create(snapshot)

        # 4. Commit first: the background build runs in its own session and must
        #    see the CREATING row; then start it.
        await self._uow.commit()
        self._launcher.launch(persisted_snapshot.id)

        return persisted_snapshot
