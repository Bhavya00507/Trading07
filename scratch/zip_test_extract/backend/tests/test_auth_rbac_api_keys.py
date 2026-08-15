import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.session import AsyncSessionLocal, engine
from app.models import Base
from app.models.user import User
from sqlalchemy import select, update, delete

@pytest.fixture(autouse=True)
async def clean_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User))
        await db.commit()

@pytest.mark.anyio
async def test_jwt_auth_refresh_rbac_api_keys():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register User
        reg_resp = await ac.post("/auth/register", json={
            "username": "auth_test_user",
            "email": "authtest@example.com",
            "password": "strongpassword123"
        })
        assert reg_resp.status_code == 201

        # 2. Login User
        login_resp = await ac.post("/auth/login", json={
            "username": "auth_test_user",
            "password": "strongpassword123"
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["username"] == "auth_test_user"
        assert data["user"]["role"] == "user"

        access_token = data["access_token"]
        refresh_token = data["refresh_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # 3. Refresh Token Rotation
        refresh_resp = await ac.post("/auth/refresh", json={
            "refresh_token": refresh_token
        })
        assert refresh_resp.status_code == 200
        ref_data = refresh_resp.json()
        assert "access_token" in ref_data
        assert "refresh_token" in ref_data
        
        new_access_token = ref_data["access_token"]
        new_headers = {"Authorization": f"Bearer {new_access_token}"}

        # 4. API Keys Management (GET & POST)
        keys_get = await ac.get("/auth/api-keys", headers=new_headers)
        assert keys_get.status_code == 200
        keys_data = keys_get.json()
        assert keys_data["binance"]["api_key"] is None
        assert keys_data["binance"]["has_secret"] is False

        keys_update = await ac.post("/auth/api-keys", json={
            "broker_id": "binance",
            "api_key": "my-binance-key-xyz",
            "api_secret": "my-super-secret-key-abc"
        }, headers=new_headers)
        assert keys_update.status_code == 200

        keys_get_after = await ac.get("/auth/api-keys", headers=new_headers)
        assert keys_get_after.status_code == 200
        keys_data_after = keys_get_after.json()
        assert keys_data_after["binance"]["api_key"] == "my-binance-key-xyz"
        assert keys_data_after["binance"]["has_secret"] is True

        # 5. RBAC Constraints (Standard User -> Forbidden)
        admin_get = await ac.get("/auth/admin/users", headers=new_headers)
        assert admin_get.status_code == 403

        # Promote user to admin directly in database
        async with AsyncSessionLocal() as db:
            q = update(User).where(User.username == "auth_test_user").values(role="admin")
            await db.execute(q)
            await db.commit()

        # Call Admin Endpoint again (Should succeed)
        admin_get_after = await ac.get("/auth/admin/users", headers=new_headers)
        assert admin_get_after.status_code == 200
        users_list = admin_get_after.json()
        assert len(users_list) == 1
        assert users_list[0]["username"] == "auth_test_user"
        assert users_list[0]["role"] == "admin"
