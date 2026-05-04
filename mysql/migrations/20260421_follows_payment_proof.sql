-- Seguimiento vendedores + comprobante de pago en pedidos manuales
USE yaprofebolt;

ALTER TABLE orders
  ADD COLUMN payment_proof_url TEXT NULL AFTER payment_reference;

CREATE TABLE IF NOT EXISTS seller_follows (
  follower_id CHAR(36) NOT NULL,
  seller_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (follower_id, seller_id),
  CONSTRAINT fk_sf_follower FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_sf_seller FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_sf_not_self CHECK (follower_id <> seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sf_seller ON seller_follows(seller_id);
