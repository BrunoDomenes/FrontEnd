import pymysql
from pymysql import Error
from dotenv import load_dotenv
import os

def conectar():
    load_dotenv()
    try:
        connection = pymysql.connect(
            host=os.getenv("host"),
            database=os.getenv("database"),
            user=os.getenv("user"),
            password=os.getenv("password"),
            port=int(os.getenv("port"))
        )
        if connection.open:
            return connection
    except Error as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return None