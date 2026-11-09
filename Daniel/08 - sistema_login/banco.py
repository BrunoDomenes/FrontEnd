import pymysql
from pymysql import Error
from dotenv import load_dotenv
from pwdlib import PasswordHash
import os

protetor = PasswordHash.recommended()

class conectar:
    def __init__(self):
        load_dotenv()
        try:
            self.connection = pymysql.connect(
                host=os.getenv("host"),
                database=os.getenv("database"),
                user=os.getenv("user"),
                password=os.getenv("password"),
                port=int(os.getenv("port"))                
            )
            if self.connection.open:
                self.cursor = self.connection.cursor()
                self.conexao = self.connection
        except Error as e:
            print(f"Erro ao conectar ao banco de dados: {e}")
            return None
    
    def criar_user(self, nome, email, senha):
        dados = (nome,email,protetor.hash(senha))
        sql = """
        insert into tb_usuario (nome, email, senha_hash)
        value (%s, %s, %s)
        """
        self.cursor.execute(sql, dados)
        self.conexao.commit()
        
        return{
            "nome":nome,
            "email":email
        }
    
    def verificar_user(self, email, senha):
        sql = """
            select * from tb_usuario
            where email =  %s
            """
        self.cursor.execute(sql,(email,))
        usuario = self.cursor.fetchone()

        if usuario is not None:
            hash_Banco = usuario[3]
            senha_correta = protetor.verify(senha,hash_Banco)
    
        if usuario is None:
            return None
        if not senha_correta:
            return None
        if not usuario[5]:
            return None
        
        return {
            "id":usuario[1],
            "nome": usuario[2],
            "perfil": usuario[4]
        }
        
        