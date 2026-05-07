-- YaProfe marketplace — MySQL 8+
-- Instalación: mysql -u root -p < mysql/schema.sql
-- (crea la base `yaprofebolt` si no existe; debe coincidir con MYSQL_DATABASE en .env)

CREATE DATABASE IF NOT EXISTS yaprofebolt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yaprofebolt;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS product_files;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE platform_settings (
  k VARCHAR(64) NOT NULL PRIMARY KEY,
  v TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_settings (k, v) VALUES ('default_commission_percent', '15');

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
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

CREATE TABLE email_verification_tokens (
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

CREATE TABLE profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT NULL,
  banner_url TEXT NULL,
  bio TEXT NULL,
  role ENUM('admin','seller','buyer') NOT NULL DEFAULT 'buyer',
  locale ENUM('es','en') NOT NULL DEFAULT 'es',
  theme_pref ENUM('light','dark','system') NOT NULL DEFAULT 'system',
  seller_handle VARCHAR(191) NULL UNIQUE,
  commission_rate DECIMAL(5,2) NULL DEFAULT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  total_sales INT NOT NULL DEFAULT 0,
  total_revenue_cents BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  name_es VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL DEFAULT '',
  icon VARCHAR(128) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  seller_id CHAR(36) NOT NULL,
  category_id BIGINT NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  description MEDIUMTEXT NULL,
  short_description VARCHAR(500) NULL,
  product_type ENUM('course','resource','template','ebook','bundle') NOT NULL DEFAULT 'resource',
  price_cents INT NOT NULL DEFAULT 0,
  original_price_cents INT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PEN',
  cover_url TEXT NULL,
  preview_url TEXT NULL,
  status ENUM('draft','pending_review','published','rejected') NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  tags JSON NULL,
  download_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_products_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT chk_price CHECK (price_cents >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured);

CREATE TABLE product_images (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  url TEXT NOT NULL,
  alt_text VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_pi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  buyer_id CHAR(36) NOT NULL,
  status ENUM('pending','paid','refunded','cancelled') NOT NULL DEFAULT 'pending',
  total_cents INT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'PEN',
  payment_method VARCHAR(64) NULL,
  payment_reference VARCHAR(255) NULL,
  payment_proof_url TEXT NULL,
  paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_orders_buyer ON orders(buyer_id);

CREATE TABLE seller_follows (
  follower_id CHAR(36) NOT NULL,
  seller_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (follower_id, seller_id),
  CONSTRAINT fk_sf_follower FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_sf_seller FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_sf_not_self CHECK (follower_id <> seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sf_seller ON seller_follows(seller_id);

CREATE TABLE order_items (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  seller_id CHAR(36) NOT NULL,
  unit_price_cents INT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  commission_cents INT NOT NULL DEFAULT 0,
  seller_revenue_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_oi_seller FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_order_items_seller ON order_items(seller_id);

CREATE TABLE reviews (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  reviewer_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_rev_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_reviewer FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE KEY uq_product_reviewer (product_id, reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reviews_product ON reviews(product_id);

CREATE TABLE product_files (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(500) NOT NULL DEFAULT '',
  file_type VARCHAR(255) NOT NULL DEFAULT '',
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_pf_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_product_files_product ON product_files(product_id);

CREATE TABLE push_subscriptions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  endpoint VARCHAR(2048) NOT NULL,
  p256dh VARCHAR(500) NOT NULL,
  auth_key VARCHAR(500) NOT NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_push_endpoint (endpoint),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (slug, name_es, name_en, icon, sort_order) VALUES
  ('matematicas', 'Matematicas', 'Mathematics', 'calculator', 1),
  ('ciencias', 'Ciencias', 'Science', 'flask', 2),
  ('lengua', 'Lengua y Literatura', 'Language Arts', 'book-open', 3),
  ('historia', 'Historia y Geografia', 'History & Geography', 'globe', 4),
  ('arte', 'Arte y Musica', 'Art & Music', 'palette', 5),
  ('tecnologia', 'Tecnologia', 'Technology', 'monitor', 6),
  ('idiomas', 'Idiomas', 'Languages', 'languages', 7),
  ('educacion-inicial', 'Educacion Inicial', 'Early Education', 'star', 8),
  ('gestion-escolar', 'Gestion Escolar', 'School Management', 'clipboard', 9),
  ('desarrollo-docente', 'Desarrollo Docente', 'Teacher Development', 'graduation-cap', 10);
