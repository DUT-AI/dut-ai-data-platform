from modules.identity.client.manage_client import ManageClient
from modules.identity.domain.interfaces import IUserDirectory
from modules.identity.dtos.manage_dtos import ManageUsersResponseDTO


class UserDirectoryService(IUserDirectory):
    """Facade for the currently supported, paginated user-list operation."""

    def __init__(self, manage_client: ManageClient) -> None:
        self.manage_client = manage_client

    async def list(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> ManageUsersResponseDTO:
        return await self.manage_client.list_users(
            page=page,
            page_size=page_size,
            search=search,
        )
