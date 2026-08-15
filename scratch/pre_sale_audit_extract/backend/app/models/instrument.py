from sqlalchemy import Column, String, Boolean
import uuid
from app.models import Base, GUID

class Instrument(Base):
    __tablename__ = "instruments"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    symbol = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    exchange = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
