-- Tokens de recuperación de contraseña (enlace por correo, caducidad 1 h en app)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_user (user_id),
  KEY idx_expires (expires_at),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
