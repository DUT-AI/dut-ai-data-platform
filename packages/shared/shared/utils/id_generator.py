from ulid import ULID


def generate_ulid() -> str:
    """Generate a string ULID."""
    return str(ULID())
