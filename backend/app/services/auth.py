from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": int(now.timestamp()), "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp())}
    return jwt.encode(payload, settings.app_secret, algorithm=ALGORITHM)

def get_user_id_from_token(token: str) -> int:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.app_secret, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
        if user_id <= 0:
            raise ValueError
        return user_id
    except (JWTError, ValueError, TypeError):
        raise credentials_error
