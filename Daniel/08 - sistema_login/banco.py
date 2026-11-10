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
        insert into tb_user (nome, email, senha_hash)
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
            select * from tb_user
            where email =  %s
            """
        self.cursor.execute(sql,(email,))
        user = self.cursor.fetchone()

        if user is not None:
            hash_Banco = user[3]
            senha_correta = protetor.verify(senha,hash_Banco)
    
        if user is None:
            return None
        if not senha_correta:
            return None
        if not user[5]:
            return None
        
        return {
            "id":user[0],
            "nome": user[1],
            "perfil": user[4]
        }
    def criar_sessao(self, token_hash, id_user, expira_em):
        sql = """
                INSERT INTO sessoes (
                    token_hash, id_user, expira_em
                )
                VALUES (%s, %s, %s)
            """
        self.cursor.execute(
            sql, (token_hash, id_user, expira_em)
        )
        self.conexao.commit()
        return
    
    def  obter_usuario_da_sessao(self, token_hash, agora):
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
        
        return user
    
    def encerrar_sessao(self, token_hash):
        sql = """
            DELETE FROM sessoes
            WHERE token_hash = %s
        """
        self.cursor.execute(sql, (token_hash))
        self.conexao.commit()

