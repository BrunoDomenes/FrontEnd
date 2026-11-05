from contextlib import closing
from pwdlib import PasswordHash

from banco import conectar

protetor = PasswordHash.recommended()

senha_teste = protetor.hash("Senac123")

def verifica_usuario(email, senha):
    with closing(conectar()) as conexao:
        with conexao.cursor() as cursor:
            sql = """
                select * from tb_usuario
                where email =  %s
                """
            cursor.execute(sql,(email,))
            usuario = cursor.fetchone()
    
    if usuario is not None:
        hash_Banco = usuario["senha_hash"]

    senha_correta = protetor.verify(senha,hash_Banco)

    if usuario is None:
        return None
    if not senha_correta:
        return None
    if not usuario["ativo"]:
        return None

    return {
        "id":usuario["id_usuario"],
        "nome": usuario["nome"],
        "perfil": usuario["perfil"]
    }
    