from sqlmodel import Session as DbSession
from sqlmodel import SQLModel, create_engine

from app.core.config import settings

engine = create_engine(settings.database_url, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with DbSession(engine) as session:
        yield session
