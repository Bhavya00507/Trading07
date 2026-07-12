import uuid
from sqlalchemy import Column, String
from app.models import Base, GUID

class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    refresh_token = Column(String, nullable=True)
    
    binance_api_key = Column(String, nullable=True)
    binance_api_secret = Column(String, nullable=True)
    bybit_api_key = Column(String, nullable=True)
    bybit_api_secret = Column(String, nullable=True)
    oanda_api_key = Column(String, nullable=True)
    oanda_api_secret = Column(String, nullable=True)
    alpaca_api_key = Column(String, nullable=True)
    alpaca_api_secret = Column(String, nullable=True)
    ibkr_api_key = Column(String, nullable=True)
    ibkr_api_secret = Column(String, nullable=True)
    mt5_api_key = Column(String, nullable=True)
    mt5_api_secret = Column(String, nullable=True)
