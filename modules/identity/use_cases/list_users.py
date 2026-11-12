from modules.identity.domain.interfaces import IUserDirectory, IUserLoginRepository
from modules.identity.dtos.user_dtos import UserReadDTO, UsersListResponseDTO


class ListUsersUseCase:
    """Use case to fetch users from Manage Service and merge local last_login_at timestamps."""

    def __init__(
        self,
        user_directory: IUserDirectory,
        login_repo: IUserLoginRepository,
    ) -> None:
        self.user_directory = user_directory
        self.login_repo = login_repo

    async def execute(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> UsersListResponseDTO:
        # 1. Fetch users from external Manage Service (Read-Only)
        manage_resp = await self.user_directory.list(
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
        user_ids = [int(u.id) for u in manage_resp.items]

        # 3. Fetch all last_login_at timestamps in 1 single DB query
        last_login_map = await self.login_repo.get_by_user_ids(user_ids)

        # 4. Merge data into UserReadDTO
        all_user_dtos = [
            UserReadDTO(
                id=int(u.id),
                name=u.name,
                email=u.email,
                status=u.status,
                avatar_url=u.avatar_url,
                role_names=u.role_names,
                last_login_at=last_login_map.get(int(u.id)),
            )
            for u in manage_resp.items
        ]

        # 5. Sắp xếp theo thời gian đăng nhập gần nhất (DESC)
        # User có last_login_at mới nhất đứng đầu, user chưa từng đăng nhập (None) đứng cuối
        all_user_dtos.sort(
            key=lambda u: (
                0 if u.last_login_at is not None else 1,
                -u.last_login_at.timestamp() if u.last_login_at is not None else 0,
            )
        )

        return UsersListResponseDTO(
            items=all_user_dtos,
            total=manage_resp.total or len(all_user_dtos),
            page=manage_resp.page,
            page_size=manage_resp.page_size,
        )
