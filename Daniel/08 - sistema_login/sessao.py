import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pymysql.cursors import DictCursor
from banco import conectar

banco = conectar()

TEMPO_SESSAO_SEGUNDOS = 15 * 60

def gerar_hash_token(token):
    # Converte o texto em bytes.
    token_bytes = token.encode("utf-8")
    # Calcula o hash SHA-256.
    resultado = hashlib.sha256(token_bytes)
    # Retorna o hash como texto hexadecimal.
    return resultado.hexdigest()

def agora_utc():
    # Obtém o horário atual em UTC.
    agora = datetime.now(timezone.utc)
    # DATETIME não armazena fuso; o valor continua em UTC.
    return agora.replace(tzinfo=None)

def criar_sessao(id_user):
    # Gera um token com 32 bytes aleatórios seguros.
    token = secrets.token_urlsafe(32)
    token_hash = gerar_hash_token(token)
    # Define quando a sessão vai expirar.
    expira_em = agora_utc() + timedelta(
        seconds=TEMPO_SESSAO_SEGUNDOS
    )
    banco.criar_sessao(token_hash, id_user, expira_em)
    # A rota colocará o token original no cookie.
    return token

def obter_usuario_da_sessao(token):
    # Sem token, não existe sessão para consultar.
    if not token:
        return None
    token_hash = gerar_hash_token(token)
    agora = agora_utc()
    
    return banco.obter_usuario_da_sessao(token_hash, agora)
   

def encerrar_sessao(token):
    if not token:
        return
    token_hash = gerar_hash_token(token)
    
    banco.encerrar_sessao(token_hash)


    