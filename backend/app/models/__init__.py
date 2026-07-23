import uuid
from sqlalchemy.orm import declarative_base
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as pgUUID

Base = declarative_base()

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36), storing as string.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(pgUUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                try:
                    return str(uuid.UUID(value))
                except ValueError:
                    return str(value)
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                try:
                    return uuid.UUID(value)
                except ValueError:
                    return value
            else:
                return value

# Import all models to register them on Base.metadata
from app.models.user import User
from app.models.account import Account
from app.models.order import Order
from app.models.position import Position
from app.models.trade_history import TradeHistory
from app.models.journal import JournalEntry, DailyJournal
from app.models.alert import DBPriceAlert
from app.models.workspace import DBWorkspace
from app.models.playbook import SetupPatternModel
from app.models.instrument import Instrument
from app.models.webhook import WebhookKey, WebhookLog
