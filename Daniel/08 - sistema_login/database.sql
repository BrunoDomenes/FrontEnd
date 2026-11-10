drop DATABASE bd_login;
create database bd_login;
use bd_login;

create table tb_user(
    id_user int primary key auto_increment,
    nome varchar(50) not null,
    email varchar(150) unique not null,
    senha_hash varchar(255) not null,
    perfil enum('admin', 'user') default('user') not null,
    ativo bool default(true)
)

CREATE TABLE sessoes (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    id_user INT NOT NULL,
    expira_em DATETIME NOT NULL,
    
    CONSTRAINT fk_sessoes_usuarios
        FOREIGN KEY (id_user)
        REFERENCES tb_user(id_user)
);