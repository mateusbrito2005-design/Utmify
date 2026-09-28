from sqlalchemy import Column, Integer, String, Boolean, DateTime
from database.core.connection import Base
from database.core.timezone import CREATED_AT_DEFAULT


class FacebookAccount(Base):
    """
    Conta do Facebook Ads conectada.
    Armazena access_token para consumir a API de métricas.
    token_valid=False indica que o token está inválido e as chamadas devem ser suprimidas.
    """
    __tablename__ = "facebook_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label = Column(String(255), nullable=False)
    account_id = Column(String(100), unique=True, nullable=False)
    access_token = Column(String(500), nullable=False)
    business_id = Column(String(100), nullable=True)
    token_valid = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, server_default=CREATED_AT_DEFAULT)

