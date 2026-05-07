-- Verificación de correo al registrarse + plantillas de correo (requiere SMTP en .env).
-- Ejecutar en el VPS: sudo mariadb yaprofebolt < mysql/migrations/20260505_email_verified.sql

USE yaprofebolt;

-- Si ya existe la columna, este ALTER fallará: ignóralo o comenta la línea.
ALTER TABLE users
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;

-- Cuentas ya existentes antes de esta migración: marcarlas como verificadas.
UPDATE users SET email_verified = 1;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_evt_token_hash (token_hash),
  KEY idx_evt_user (user_id),
  KEY idx_evt_expires (expires_at),
  CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
