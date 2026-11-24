"""Acesso ao MySQL com uma conexão por requisição (sem estado global)."""

from __future__ import annotations

import logging
import os
import secrets
from functools import lru_cache

import pymysql
from dotenv import load_dotenv
from pwdlib import PasswordHash
from pymysql import Error
from pymysql.cursors import DictCursor
from pymysql.err import IntegrityError

load_dotenv()

logger = logging.getLogger(__name__)

protetor = PasswordHash.recommended()

# Hash descartável: verificado quando o e-mail não existe, para que o tempo de
# resposta não revele quais contas estão cadastradas (user enumeration).
_HASH_DUMMY = protetor.hash(secrets.token_hex(16))


class ErroBanco(Exception):
    """Falha de infraestrutura do banco de dados."""


@lru_cache(maxsize=1)
def _configuracao() -> dict:
    obrigatorias = ("host", "database", "user", "password")
    faltando = [chave for chave in obrigatorias if not os.getenv(chave)]
    if faltando:
        raise RuntimeError(
            "Variáveis de ambiente ausentes: "
            + ", ".join(faltando)
            + ". Configure o arquivo .env (veja .env_example)."
        )

    return {
        "host": os.getenv("host"),
        "database": os.getenv("database"),
        "user": os.getenv("user"),
        "password": os.getenv("password"),
        "port": int(os.getenv("port", "3306")),
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "autocommit": False,
        "connect_timeout": 10,
        "read_timeout": 15,
        "write_timeout": 15,
    }


class Banco:
    """Conexão e cursor de uso exclusivo de uma requisição.

    Nunca compartilhe esta instância entre threads: o cursor do PyMySQL não é
    thread-safe e o compartilhamento pode misturar resultados entre usuários.
    """

    def __init__(self, conexao: pymysql.connections.Connection) -> None:
        self.conexao = conexao
        self.cursor = conexao.cursor()

    @classmethod
    def abrir(cls) -> "Banco":
        try:
            conexao = pymysql.connect(**_configuracao())
        except (Error, OSError) as exc:
            raise ErroBanco("Não foi possível conectar ao banco de dados.") from exc
        return cls(conexao)

    def __enter__(self) -> "Banco":
        return self

    def __exit__(self, *_exc) -> None:
        self.fechar()

    def fechar(self) -> None:
        try:
            self.cursor.close()
        except Exception:
            pass
        try:
            self.conexao.close()
        except Exception:
            pass

    # ------------------------------------------------------------------ usuários
    def criar_user(self, nome: str, email: str, senha: str) -> bool:
        """Cria o usuário. Retorna False se o e-mail já existir."""
        sql = "INSERT INTO tb_user (nome, email, senha_hash) VALUES (%s, %s, %s)"
        try:
            self.cursor.execute(sql, (nome, email, protetor.hash(senha)))
            self.conexao.commit()
            return True
        except IntegrityError:
            self.conexao.rollback()
            return False

    def verificar_user(self, email: str, senha: str) -> dict | None:
        sql = """
            SELECT id_user, nome, email, senha_hash, perfil, ativo
            FROM tb_user
            WHERE email = %s
        """
        self.cursor.execute(sql, (email,))
        user = self.cursor.fetchone()

        if user is None:
            try:
                protetor.verify(senha, _HASH_DUMMY)
            except Exception:
                pass
            return None

        try:
            senha_correta = protetor.verify(senha, user["senha_hash"])
        except Exception:
            logger.warning("Hash de senha inválido para o usuário %s", user["id_user"])
            return None

        if not senha_correta or not user["ativo"]:
            return None

        return {
            "id": user["id_user"],
            "nome": user["nome"],
            "perfil": user["perfil"],
        }

    # ------------------------------------------------------------------- sessões
    def criar_sessao(self, token_hash: str, id_user: int, expira_em) -> None:
        sql = """
            INSERT INTO sessoes (token_hash, id_user, expira_em)
            VALUES (%s, %s, %s)
        """
        self.cursor.execute(sql, (token_hash, id_user, expira_em))
        self.conexao.commit()

    def obter_usuario_da_sessao(self, token_hash: str, agora) -> dict | None:
        sql = """
            SELECT
                tb_user.id_user,
                tb_user.nome,
                tb_user.perfil
            FROM sessoes
            INNER JOIN tb_user
                ON tb_user.id_user = sessoes.id_user
            WHERE sessoes.token_hash = %s
                AND sessoes.expira_em > %s
                AND tb_user.ativo = 1
        """
        self.cursor.execute(sql, (token_hash, agora))
        user = self.cursor.fetchone()
        if user is None:
            return None
        return {
            "id": user["id_user"],
            "nome": user["nome"],
            "perfil": user["perfil"],
        }

    def encerrar_sessao(self, token_hash: str) -> None:
        # Atenção: a vírgula é obrigatória; sem ela o argumento não é uma tupla.
        self.cursor.execute(
            "DELETE FROM sessoes WHERE token_hash = %s", (token_hash,)
        )
        self.conexao.commit()

    def limpar_sessoes_expiradas(self, agora) -> int:
        self.cursor.execute("DELETE FROM sessoes WHERE expira_em <= %s", (agora,))
        self.conexao.commit()
        return self.cursor.rowcount
