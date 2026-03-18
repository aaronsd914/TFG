import os

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_MINUTES: int = 60
