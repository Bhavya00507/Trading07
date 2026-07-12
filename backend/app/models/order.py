from sqlalchemy import Column, String, Float, Enum, DateTime, func, Boolean
import uuid
import enum
from app.models import Base, GUID

class OrderSide(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(str, enum.Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    OCO = "oco"
    TWAP = "twap"
    VWAP = "vwap"
    ICEBERG = "iceberg"
    TRAILING_STOP = "trailing_stop"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    FILLED = "filled"
    PARTIAL = "partial"
    CANCELLED = "cancelled"

class Order(Base):
    __tablename__ = "orders"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)

    symbol = Column(String, nullable=False, index=True)
    side = Column(Enum(OrderSide), nullable=False)
    type = Column(Enum(OrderType), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=True)  # limit price
    stop_price = Column(Float, nullable=True)  # stop trigger price for stop/stop_limit
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    account_type = Column(String, nullable=False, default="live")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    is_reduce_only = Column(Boolean, nullable=False, default=False)
    is_post_only = Column(Boolean, nullable=False, default=False)
    time_in_force = Column(String(10), nullable=False, default="GTC")  # 'GTC', 'IOC', 'FOK', 'GTD'
    gtd_timestamp = Column(DateTime(timezone=True), nullable=True)
    iceberg_visible_qty = Column(Float, nullable=True)
    oco_link_id = Column(String(50), nullable=True)
    algo_type = Column(String(20), nullable=True)
    algo_params = Column(String(250), nullable=True)
    position_ticket = Column(String, nullable=True)

