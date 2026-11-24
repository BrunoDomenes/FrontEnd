-- Script idempotente e NÃO destrutivo.
-- Para recriar a base do zero, descomente o bloco de reset no final (isso APAGA os dados).

CREATE DATABASE IF NOT EXISTS bd_login
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bd_login;

CREATE TABLE IF NOT EXISTS tb_user (
    id_user INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM('admin', 'user') DEFAULT 'user' NOT NULL,
    ativo BOOL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessoes (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    id_user INT NOT NULL,
    expira_em DATETIME NOT NULL,

    INDEX idx_sessoes_expira_em (expira_em),

    CONSTRAINT fk_sessoes_usuarios
        FOREIGN KEY (id_user)
        REFERENCES tb_user(id_user)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bases já existentes: aplique o índice manualmente uma vez.
-- ALTER TABLE sessoes ADD INDEX idx_sessoes_expira_em (expira_em);

-- ---------------------------------------------------------------------------
-- RESET DESTRUTIVO (use conscientemente; apaga todos os dados)
-- DROP DATABASE bd_login;
-- ---------------------------------------------------------------------------
