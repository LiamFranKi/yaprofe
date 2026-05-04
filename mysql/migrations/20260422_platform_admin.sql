-- Ejecutar si ya tenías la BD creada: mysql -u root -p yaprofebolt < mysql/migrations/20260422_platform_admin.sql

USE yaprofebolt;

CREATE TABLE IF NOT EXISTS platform_settings (
  k VARCHAR(64) NOT NULL PRIMARY KEY,
  v TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_settings (k, v) VALUES ('default_commission_percent', '15')
  ON DUPLICATE KEY UPDATE k = k;

-- Comisión por vendedor: NULL = usar comisión general de platform_settings
ALTER TABLE profiles
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_verified;

-- Si tu MySQL ya tenía commission_rate NOT NULL, primero quita default y permite NULL:
ALTER TABLE profiles MODIFY COLUMN commission_rate DECIMAL(5,2) NULL DEFAULT NULL;
