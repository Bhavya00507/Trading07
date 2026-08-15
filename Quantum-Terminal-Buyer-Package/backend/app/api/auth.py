import uuid
import sys
print("AUTH VERSION = 2026-07-12-001", file=sys.stderr)
import traceback
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from app.database.session import get_db
from app.models.user import User
from app.models.account import Account
from app.core.auth import get_password_hash, verify_password, create_access_token, decode_access_token, create_refresh_token
import jwt
from app.core.config import JWT_SECRET, JWT_ALGORITHM
from typing import List

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

class RefreshRequest(BaseModel):
    refresh_token: str

class APIKeyUpdateRequest(BaseModel):
    broker_id: str
    api_key: str
    api_secret: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    role: str

    class Config:
        orm_mode = True
        from_attributes = True

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)) -> UUID:
    """Dependency to retrieve and validate the current authenticated user's ID."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id_str = payload.get("user_id")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user_id",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user_id format",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/register")
async def register(req: RegisterRequest, db=Depends(get_db)):
    import sys, os
    from app.core.config import DATABASE_URL
    from app.database.session import engine
    
    clean_url = DATABASE_URL
    if "///" in clean_url:
        db_path_str = clean_url.split("///")[1]
    else:
        db_path_str = clean_url
    abs_path = os.path.abspath(db_path_str)
    print(f"INSERT DATABASE PATH: {abs_path}", file=sys.stderr)

    print("REGISTER FUNCTION ENTERED", file=sys.stderr)
    print(f"[REGISTER] Request received: username={req.username!r} email={req.email!r}")
    try:
        # Step 1: Basic email format check
        print("[REGISTER] Step 1: Validating email format")
        if "@" not in req.email or "." not in req.email:
            print("[REGISTER] Validation failed: Invalid email format")
            return JSONResponse(status_code=400, content={"detail": "Invalid email format"})

        # Step 2: Check username uniqueness
        print(f"[REGISTER] Step 2: Executing database query to check username: {req.username}")
        username_stmt = select(User).where(User.username == req.username)
        username_res = await db.execute(username_stmt)
        existing_username = username_res.scalar_one_or_none()
        print(f"[REGISTER] Step 2 query finished. Result: existing_username={existing_username}")
        if existing_username:
            print("[REGISTER] Validation failed: Username already registered")
            return JSONResponse(status_code=400, content={"detail": "Username already registered"})

        # Step 3: Check email uniqueness
        print(f"[REGISTER] Step 3: Executing database query to check email: {req.email}")
        email_stmt = select(User).where(User.email == req.email)
        email_res = await db.execute(email_stmt)
        existing_email = email_res.scalar_one_or_none()
        print(f"[REGISTER] Step 3 query finished. Result: existing_email={existing_email}")
        if existing_email:
            print("[REGISTER] Validation failed: Email already registered")
            return JSONResponse(status_code=400, content={"detail": "Email already registered"})

        # Step 4: Hash password
        print("[REGISTER] Step 4: Hashing password")
        user_id = uuid.uuid4()
        hashed_pwd = get_password_hash(req.password)
        print(f"[REGISTER] Step 4 done: user_id={user_id}")

        # Step 5: Create user record
        print(f"[REGISTER] Step 5: Creating User object and staging with db.add() for user_id: {user_id}")
        new_user = User(
            id=user_id,
            username=req.username,
            email=req.email,
            hashed_password=hashed_pwd
        )
        db.add(new_user)
        print("[REGISTER] Step 5 done: User added to database session")

        # Step 6: Create accounts
        print("[REGISTER] Step 6: Creating Account objects and staging with db.add() (live, paper, demo)")
        for acct_type in ["live", "paper", "demo"]:
            new_account = Account(
                id=uuid.uuid4(),
                user_id=user_id,
                balance=10000.0,
                equity=10000.0,
                peak_balance=10000.0,
                margin_used=0.0,
                free_margin=10000.0,
                daily_pnl=0.0,
                drawdown=0.0,
                account_type=acct_type
            )
            print(f"[REGISTER] Adding account type {acct_type!r} for user {user_id}")
            db.add(new_account)
        print("[REGISTER] Step 6 done: Accounts added to database session")

        # Step 7: Commit
        print("[REGISTER] Step 7: Committing transaction to SQLite...")
        await db.commit()
        print("[REGISTER] Step 7 done: Commit successful")

        try:
            print("=== USERS IN DATABASE AFTER REGISTER ===", file=sys.stderr)
            users_res = await db.execute(select(User.username, User.email))
            rows = users_res.all()
            for r in rows:
                print(f"User: username={r[0]} email={r[1]}", file=sys.stderr)
            print("========================================", file=sys.stderr)
        except Exception as query_exc:
            print(f"Error querying users in register: {query_exc}", file=sys.stderr)

        print("[REGISTER] Success — returning HTTP 201")
        return JSONResponse(status_code=201, content={"message": "User registered successfully"})

    except Exception as e:
        print("[REGISTER] Exception caught in auth.py register handler!", file=sys.stderr)
        print(f"[REGISTER] Exception Type: {type(e).__name__}", file=sys.stderr)
        print(f"[REGISTER] Exception Message: {e}", file=sys.stderr)
        print("[REGISTER] Printing full python traceback:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print("[REGISTER] Re-raising exception to expose stack trace in Logcat...", file=sys.stderr)
        raise e

@router.post("/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    import sys, os
    from app.core.config import DATABASE_URL
    from app.database.session import engine
    from sqlalchemy import func
    
    clean_url = DATABASE_URL
    if "///" in clean_url:
        db_path_str = clean_url.split("///")[1]
    else:
        db_path_str = clean_url
    abs_path = os.path.abspath(db_path_str)
    print(f"SELECT DATABASE PATH: {abs_path}", file=sys.stderr)

    # Print users info before authentication
    try:
        count_res = await db.execute(select(func.count(User.id)))
        users_count = count_res.scalar() or 0
        print(f"SELECT COUNT(*) FROM users: {users_count}", file=sys.stderr)
        
        users_res = await db.execute(select(User.username, User.email))
        rows = users_res.all()
        print("SELECT username,email FROM users:", file=sys.stderr)
        for r in rows:
            print(f"  username={r[0]}, email={r[1]}", file=sys.stderr)
    except Exception as query_exc:
        print(f"Error querying users info: {query_exc}", file=sys.stderr)

    print("LOGIN FUNCTION ENTERED", file=sys.stderr)
    print("[LOGIN] Step 1: Request received", file=sys.stderr)
    try:
        try:
            print("[LOGIN] Step 2: Before execute() (User query)", file=sys.stderr)
            stmt = select(User).where(User.username == req.username)
            res = await db.execute(stmt)
            print("[LOGIN] Step 3: After execute() (User query)", file=sys.stderr)
            user = res.scalar_one_or_none()
            print(f"[LOGIN] User query result: {user}", file=sys.stderr)
        except Exception as e:
            print(f"[LOGIN] Exception in Step 2/3 user query: {e}", file=sys.stderr)
            return JSONResponse(
                status_code=500,
                content={
                    "detail": f"User query failed: {str(e)}",
                    "traceback": traceback.format_exc()
                }
            )

        if not user:
            print("[LOGIN] User not found", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            print("Stored hash:", user.hashed_password, file=sys.stderr)
            print("Entered password:", req.password, file=sys.stderr)
            print("[LOGIN] Step 4: Before verify_password()", file=sys.stderr)
            is_verified = verify_password(req.password, user.hashed_password)
            print("[LOGIN] Step 5: After verify_password()", file=sys.stderr)
            print("verify_password result:", is_verified, file=sys.stderr)
        except Exception as e:
            print(f"[LOGIN] Exception in verify_password: {e}", file=sys.stderr)
            return JSONResponse(
                status_code=500,
                content={
                    "detail": f"verify_password execution failed: {str(e)}",
                    "traceback": traceback.format_exc()
                }
            )

        if not is_verified:
            print("[LOGIN] Password verification failed", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        print("[LOGIN] Password verified", file=sys.stderr)

        try:
            print("[LOGIN] Step 6: Before create_access_token()", file=sys.stderr)
            access_token = create_access_token({"user_id": str(user.id), "username": user.username})
            print("[LOGIN] Step 7: After create_access_token()", file=sys.stderr)
            print("[LOGIN] Access token created", file=sys.stderr)
        except Exception as e:
            print(f"[LOGIN] Exception in create_access_token: {e}", file=sys.stderr)
            return JSONResponse(
                status_code=500,
                content={
                    "detail": f"create_access_token failed: {str(e)}",
                    "traceback": traceback.format_exc()
                }
            )

        try:
            print("[LOGIN] Step 8: Before create_refresh_token()", file=sys.stderr)
            refresh_token = create_refresh_token({"user_id": str(user.id), "username": user.username})
            print("[LOGIN] Step 9: After create_refresh_token()", file=sys.stderr)
            print("[LOGIN] Refresh token created", file=sys.stderr)
        except Exception as e:
            print(f"[LOGIN] Exception in create_refresh_token: {e}", file=sys.stderr)
            return JSONResponse(
                status_code=500,
                content={
                    "detail": f"create_refresh_token failed: {str(e)}",
                    "traceback": traceback.format_exc()
                }
            )

        try:
            print("[LOGIN] Step 10: Before commit()", file=sys.stderr)
            user.refresh_token = refresh_token
            await db.commit()
            print("[LOGIN] Step 11: After commit()", file=sys.stderr)
            print("[LOGIN] Commit successful", file=sys.stderr)
        except Exception as e:
            print(f"[LOGIN] Exception in db.commit(): {e}", file=sys.stderr)
            return JSONResponse(
                status_code=500,
                content={
                    "detail": f"Database commit failed: {str(e)}",
                    "traceback": traceback.format_exc()
                }
            )

        print("[LOGIN] Step 12: Before return", file=sys.stderr)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"[LOGIN] Uncaught exception: {e}", file=sys.stderr)
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(e),
                "traceback": traceback.format_exc()
            }
        )

@router.post("/refresh")
async def refresh(req: RefreshRequest, db=Depends(get_db)):
    try:
        payload = jwt.decode(req.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id_str = payload.get("user_id")
        if not user_id_str:
            raise HTTPException(status_code=400, detail="Invalid token payload")
        user_id = UUID(user_id_str)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    stmt = select(User).where(User.id == user_id, User.refresh_token == req.refresh_token)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")
        
    new_access = create_access_token({"user_id": str(user.id), "username": user.username})
    new_refresh = create_refresh_token({"user_id": str(user.id), "username": user.username})
    
    user.refresh_token = new_refresh
    await db.commit()
    
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
async def get_me(db=Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/api-keys")
async def get_api_keys(db=Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "binance_spot": {"api_key": user.binance_api_key, "has_secret": bool(user.binance_api_secret)},
        "binance": {"api_key": user.binance_api_key, "has_secret": bool(user.binance_api_secret)},
        "bybit": {"api_key": user.bybit_api_key, "has_secret": bool(user.bybit_api_secret)},
        "oanda": {"api_key": user.oanda_api_key, "has_secret": bool(user.oanda_api_secret)},
        "alpaca": {"api_key": user.alpaca_api_key, "has_secret": bool(user.alpaca_api_secret)},
        "ib": {"api_key": user.ibkr_api_key, "has_secret": bool(user.ibkr_api_secret)},
        "mt5": {"api_key": user.mt5_api_key, "has_secret": bool(user.mt5_api_secret)}
    }

@router.post("/api-keys")
async def update_api_keys(req: APIKeyUpdateRequest, db=Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    bid = req.broker_id.lower()
    if bid == "binance_spot" or bid == "binance":
        user.binance_api_key = req.api_key
        user.binance_api_secret = req.api_secret
    elif bid == "bybit":
        user.bybit_api_key = req.api_key
        user.bybit_api_secret = req.api_secret
    elif bid == "oanda":
        user.oanda_api_key = req.api_key
        user.oanda_api_secret = req.api_secret
    elif bid == "alpaca":
        user.alpaca_api_key = req.api_key
        user.alpaca_api_secret = req.api_secret
    elif bid == "ib":
        user.ibkr_api_key = req.api_key
        user.ibkr_api_secret = req.api_secret
    elif bid == "mt5":
        user.mt5_api_key = req.api_key
        user.mt5_api_secret = req.api_secret
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported broker: {req.broker_id}")
        
    await db.commit()
    return {"message": f"API keys for {req.broker_id} updated successfully"}

# RBAC Check Dependency Helper
def require_role(allowed_roles: List[str]):
    async def dependency(db=Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user or user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")
        return user
    return dependency

@router.get("/admin/users")
async def admin_get_users(admin_user: User = Depends(require_role(["admin"])), db=Depends(get_db)):
    stmt = select(User)
    res = await db.execute(stmt)
    users = res.scalars().all()
    return [{"id": str(u.id), "username": u.username, "role": u.role} for u in users]
