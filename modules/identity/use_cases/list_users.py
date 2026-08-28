from modules.identity.client.manage_client import ManageClient
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.dtos.user_dtos import UserReadDTO, UsersListResponseDTO


class ListUsersUseCase:
    """Use case to fetch users from Manage Service and merge local last_login_at timestamps."""

    def __init__(
        self,
        manage_client: ManageClient,
        login_repo: IUserLoginRepository,
    ) -> None:
        self.manage_client = manage_client
        self.login_repo = login_repo

    async def execute(
        self,
        token: str,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> UsersListResponseDTO:
        # 1. Fetch users from external Manage Service (Read-Only)
        manage_resp = await self.manage_client.list_users(
            token=token,
            page=page,
            page_size=page_size,
            search=search,
        )

        if not manage_resp.items:
            return UsersListResponseDTO(
                items=[],
                total=manage_resp.total,
                page=manage_resp.page,
                page_size=manage_resp.page_size,
            )

        # 2. Extract user IDs for batch query (Prevent N+1 query)
        user_ids = [str(u.id) for u in manage_resp.items]

        # 3. Fetch all last_login_at timestamps in 1 single DB query
        last_login_map = await self.login_repo.get_by_user_ids(user_ids)

        # 4. Merge data into UserReadDTO
        items = [
            UserReadDTO(
                id=u.id,
                name=u.name,
                email=u.email,
                status=u.status,
                avatar_url=u.avatar_url,
                role_names=u.role_names,
                last_login_at=last_login_map.get(str(u.id)),
            )
            for u in manage_resp.items
        ]

        return UsersListResponseDTO(
            items=items,
            total=manage_resp.total,
            page=manage_resp.page,
            page_size=manage_resp.page_size,
        )
