"""Geração e validação de sessões opacas (token aleatório + hash no banco)."""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from banco import Banco

TEMPO_SESSAO_SEGUNDOS = int(os.getenv("TEMPO_SESSAO_SEGUNDOS", str(15 * 60)))


def gerar_hash_token(token: str) -> str:
    """SHA-256 do token. O banco nunca guarda o token em texto claro."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def agora_utc() -> datetime:
    """Horário atual em UTC, sem tzinfo (compatível com DATETIME do MySQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def criar_sessao(banco: Banco, id_user: int) -> str:
    token = secrets.token_urlsafe(32)
    expira_em = agora_utc() + timedelta(seconds=TEMPO_SESSAO_SEGUNDOS)
    banco.criar_sessao(gerar_hash_token(token), id_user, expira_em)
    return token


def obter_usuario_da_sessao(banco: Banco, token: str | None) -> dict | None:
    if not token:
        return None
    return banco.obter_usuario_da_sessao(gerar_hash_token(token), agora_utc())


def encerrar_sessao(banco: Banco, token: str | None) -> None:
    if not token:
        return
    banco.encerrar_sessao(gerar_hash_token(token))


def limpar_sessoes_expiradas(banco: Banco) -> int:
    return banco.limpar_sessoes_expiradas(agora_utc())
