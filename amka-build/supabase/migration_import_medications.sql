-- ============================================
-- MIGRATION: Import produits_pharmacie → medications
-- Mappe les données du catalogue OCR vers la table medications existante
-- Exécuter APRÈS seed_pharmacie_products.sql
-- ============================================

-- 1. Vérifier si la table medications existe, sinon la créer
CREATE TABLE IF NOT EXISTS medications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'unité',
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INT DEFAULT 0,
    threshold INT DEFAULT 10,
    expiry_date DATE,
    supplier_id UUID REFERENCES pharmacy_suppliers(id),
    batch_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer un index pour éviter les doublons par nom
CREATE UNIQUE INDEX IF NOT EXISTS idx_medications_name ON medications(name);

-- 3. Importer les données depuis produits_pharmacie vers medications
-- Mapping: nom_produit → name, categorie → category, prix_unitaire_fc → price, 
--          unite_vente → unit, stock_initial → stock, description → description (via notes),
--          forme → ajouté à la description, statut → is_active
INSERT INTO medications (name, category, unit, price, stock, threshold, is_active, created_at, updated_at)
SELECT 
    nom_produit AS name,
    categorie AS category,
    unite_vente AS unit,
    prix_unitaire_fc AS price,
    stock_initial AS stock,
    CASE 
        WHEN stock_initial > 0 THEN GREATEST(stock_initial / 2, 5)
        ELSE 10
    END AS threshold,
    CASE 
        WHEN statut = 'actif' THEN true
        ELSE false
    END AS is_active,
    NOW() AS created_at,
    NOW() AS updated_at
FROM produits_pharmacie
WHERE nom_produit IS NOT NULL
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    threshold = EXCLUDED.threshold,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4. Vérification
SELECT 
    category,
    COUNT(*) AS nombre_produits,
    ROUND(AVG(price), 0) AS prix_moyen_fc,
    SUM(stock) AS stock_total
FROM medications
WHERE is_active = true
GROUP BY category
ORDER BY nombre_produits DESC;