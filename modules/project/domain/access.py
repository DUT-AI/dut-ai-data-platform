from typing import Protocol


class IProjectAccessChecker(Protocol):
    """Integration contract implemented by the Project Member module."""

    async def accessible_project_ids(self, user_id: str) -> set[str]: ...
