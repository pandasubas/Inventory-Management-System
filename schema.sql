-- =====================================================================
-- Stockly - Inventory Management Database Schema (MySQL 8+ / MariaDB)
-- Run with:  mysql -u root -p < database/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS stockly
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stockly;

-- ---------------------------------------------------------------------
-- Users (login / signup)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,          -- store a hash, never plain text
  role          ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  remember_me   TINYINT(1)    NOT NULL DEFAULT 0,
  last_login_at DATETIME      NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Password reset ("Forgot password" link)
CREATE TABLE IF NOT EXISTS password_resets (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  used_at    DATETIME     NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  contact_name  VARCHAR(120) NULL,
  email         VARCHAR(190) NULL,
  phone         VARCHAR(40)  NULL,
  address       VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Products
--  stock_status is generated: out / low / in-stock
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(180)   NOT NULL,
  sku            VARCHAR(60)    NOT NULL UNIQUE,
  category_id    INT UNSIGNED   NULL,
  supplier_id    INT UNSIGNED   NULL,
  unit           VARCHAR(20)    NOT NULL DEFAULT 'pcs',
  purchase_price DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  price          DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  quantity       INT            NOT NULL DEFAULT 0,
  reorder_level  INT            NOT NULL DEFAULT 0,
  status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  stock_status   VARCHAR(12) AS (
                   CASE
                     WHEN quantity <= 0            THEN 'out'
                     WHEN quantity <= reorder_level THEN 'low'
                     ELSE 'in-stock'
                   END
                 ) STORED,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_product_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_products_name (name),
  INDEX idx_products_stock_status (stock_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Stock movements (stock in / out history)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NULL,
  type        ENUM('in','out','adjustment') NOT NULL,
  quantity    INT          NOT NULL,
  note        VARCHAR(255) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_move_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_move_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  INDEX idx_move_product (product_id, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Helper view: products that need restocking
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_low_stock AS
SELECT p.id, p.name, p.sku, p.quantity, p.reorder_level, p.stock_status,
       c.name AS category, s.name AS supplier
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers  s ON s.id = p.supplier_id
WHERE p.quantity <= p.reorder_level;

-- ---------------------------------------------------------------------
-- Sample data (matches the demo data in the app)
-- ---------------------------------------------------------------------
INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Devices & gadgets'),
  ('Office',      'Office supplies'),
  ('Furniture',   'Chairs, desks and more')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO suppliers (name, contact_name, email, phone) VALUES
  ('Acme Corp', 'Jane Doe', 'sales@acme.co', '555-1010'),
  ('Globex',    'Alex Kim', 'hi@globex.io',  '555-2020');

INSERT INTO products (name, sku, category_id, supplier_id, unit, purchase_price, price, quantity, reorder_level) VALUES
  ('Wireless Mouse',      'WM-001', 1, 1, 'pcs',  8.00,  19.99,  42, 10),
  ('Mechanical Keyboard', 'KB-220', 1, 2, 'pcs', 42.00,  89.00,   3,  5),
  ('Office Chair',        'OC-500', 3, 1, 'pcs', 90.00, 189.50,   0,  3),
  ('A4 Paper Ream',       'PP-A4',  2, 2, 'ream', 3.00,   6.50, 120, 20)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);