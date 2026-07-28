from app.application.dtos.user import UserRegisterInput
from app.core.security import hash_password
from app.domain.entities.user import UserEntity
from app.domain.exceptions.exceptions import ConflictException
from app.domain.interfaces.user_repo import IUserRepository


class RegisterUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, payload: UserRegisterInput) -> UserEntity:
        # Check if user already exists
        existing_user = await self._user_repo.get_by_email(payload.email)
        if existing_user:
            raise ConflictException(f"Email {payload.email} đã được đăng ký sử dụng")

        # Create user entity with hashed password
        hashed = hash_password(payload.password)
        new_user = UserEntity(
            email=payload.email,
            password_hash=hashed,
            name=payload.name,
            role="user",  # Default role
        )

        created_user = await self._user_repo.add(new_user)
        return created_user
