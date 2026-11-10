create database bd_login;
use bd_login;

create table tb_user(
    id_user int primary key auto_increment,
    nome varchar(50) not null,
    email varchar(150) unique not null,
    senha varchar(255) not null,
    tipo enum('admin', 'user') default('user') not null,
    ativo bool default(true)
)