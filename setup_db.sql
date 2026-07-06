-- =============================================
-- Joyería AZ — Setup de Base de Datos
-- Ejecutar en HeidiSQL, phpMyAdmin (Laragon) o terminal MySQL
-- =============================================

CREATE DATABASE IF NOT EXISTS jewelry_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jewelry_db;

-- TABLA USUARIOS
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(100),
  apellidos VARCHAR(100),
  telefono VARCHAR(20),
  telefonoFijo VARCHAR(20),
  dni VARCHAR(30),
  fechaNacimiento DATE,
  genero VARCHAR(20),
  empresa VARCHAR(100),
  pais VARCHAR(60),
  departamento VARCHAR(60),
  ciudad VARCHAR(60),
  direccion VARCHAR(255),
  direccion2 VARCHAR(255),
  codigoPostal VARCHAR(20),
  referencia VARCHAR(255),
  rol ENUM('cliente','admin') DEFAULT 'cliente',
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB;

-- TABLA PRODUCTOS
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  stock INT DEFAULT 0,
  descripcion TEXT,
  categoria VARCHAR(100) DEFAULT 'General',
  imagen VARCHAR(255),
  destacado TINYINT(1) DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB;

-- INSERTAR PRODUCTOS DE EJEMPLO (solo si la tabla está vacía)
INSERT INTO products (nombre, precio, stock, descripcion, categoria, destacado, activo)
SELECT 'Anillo Esmeralda Muzo', 2500000, 5, 'Anillo en oro 18k con esmeralda colombiana certificada de las minas de Muzo. Verde intenso incomparable.', 'anillo', 1, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1) UNION ALL
SELECT 'Collar Esmeraldas Chivor', 3800000, 3, 'Collar elegante con tres esmeraldas de Chivor en montura de oro blanco 18k. Certificación GIA incluida.', 'collar', 1, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1) UNION ALL
SELECT 'Aretes Gota Esmeralda', 1200000, 8, 'Aretes tipo gota con esmeralda colombiana ovalada. Montura en plata 925 con baño de oro.', 'aretes', 0, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1) UNION ALL
SELECT 'Pulsera Eslabones Dorados', 980000, 6, 'Pulsera de eslabones en oro 18k con incrustaciones de esmeralda. Cierre de seguridad.', 'pulsera', 0, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1) UNION ALL
SELECT 'Anillo Solitario Esmeralda', 3200000, 2, 'Solitario clásico con esmeralda redonda de 1.5 quilates en oro amarillo 18k.', 'anillo', 1, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1) UNION ALL
SELECT 'Collar Cadena Oro 18k', 1800000, 4, 'Cadena fina en oro 18k de 45cm con dije de esmeralda. Elegante y versátil.', 'collar', 0, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1) UNION ALL
SELECT 'Set Aretes y Collar', 4500000, 2, 'Set completo: aretes y collar a juego con esmeraldas colombianas de primera calidad.', 'collar', 1, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1) UNION ALL
SELECT 'Pulsera Brazalete Esmeralda', 2100000, 3, 'Brazalete rígido en oro 18k con esmeraldas engastadas. Pieza artesanal única.', 'pulsera', 0, 1 FROM dual WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

-- CREAR USUARIO ADMIN POR DEFECTO (contraseña: Admin2024)
-- Hash de bcrypt de "Admin2024" con salt 10
INSERT IGNORE INTO users (email, `contraseña`, nombre, apellidos, rol)
VALUES ('admin@joyeriaaz.com', '$2a$10$rGxhxAFbTGMH2FW7r6hKJuG1QhJxV4G7M3zQpE2wRtJ0S6s9LKpDS', 'Administrador', 'AZ', 'admin');

SELECT 'Base de datos configurada exitosamente.' AS resultado;
SELECT COUNT(*) AS total_productos FROM products;
SELECT COUNT(*) AS total_usuarios FROM users;
