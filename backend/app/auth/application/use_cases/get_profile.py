from app.domain.entities.user import UserEntity
from app.domain.exceptions.exceptions import NotFoundException
from app.domain.interfaces.user_repo import IUserRepository


class GetProfileUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: int) -> UserEntity:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("Không tìm thấy thông tin người dùng")
        return user
