from senha_hash import verifica_usuario
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

@app.get("/")
def init():
    return {"Mensagem":"Api rodando..."}

class DadosLogin(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    senha: str = Field(min_length=1, max_length=128)

@app.post("/login")
def login(dados: DadosLogin):
    email = dados.email.strip().lower()
    user = verifica_usuario(email, dados.senha)
    
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Email é Senha Inválida"
        )
    return {
        "mensagem":"login efetuado"
    }
    