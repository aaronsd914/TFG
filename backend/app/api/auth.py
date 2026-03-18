from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from backend.app.database import get_db
from backend.app.entidades.usuario import UsuarioDB, Usuario
from backend.app.utils.jwt_utils import create_access_token
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(UsuarioDB).filter(UsuarioDB.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=Usuario)
def me(current_user: UsuarioDB = Depends(get_current_user)):
    return current_user
