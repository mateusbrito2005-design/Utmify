import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@db:5432/logpose"
)

# Hosts like Railway hand out a bare "postgresql://" URL, which recent
# SQLAlchemy versions resolve to the psycopg (v3) dialect by default — not
# installed here, only psycopg2-binary is (see requirements.txt) — and the
# app fails to boot. Force the psycopg2 driver explicitly so it works
# regardless of which raw scheme the URL arrives with.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
