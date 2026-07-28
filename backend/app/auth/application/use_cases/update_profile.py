from app.application.dtos.user import UserUpdateInput
from app.domain.entities.user import UserEntity
from app.domain.exceptions.exceptions import NotFoundException
from app.domain.interfaces.user_repo import IUserRepository


class UpdateProfileUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: int, payload: UserUpdateInput) -> UserEntity:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("Không tìm thấy thông tin người dùng")

        if payload.name is not None:
            user.name = payload.name
        if payload.avatar_url is not None:
            user.avatar_url = payload.avatar_url

        updated_user = await self._user_repo.update(user)
        return updated_user
