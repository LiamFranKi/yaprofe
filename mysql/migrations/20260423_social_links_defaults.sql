-- Opcional: valor por defecto de YouTube (solo si la fila no existe). Ejecutar en phpMyAdmin si quieres el enlace inicial.
USE yaprofebolt;

INSERT INTO platform_settings (k, v) VALUES ('social_youtube', 'https://www.youtube.com/@yaprofe')
  ON DUPLICATE KEY UPDATE k = k;
