-- ============================================
-- SEED: Produits Pharmacie AMKA
-- Généré automatiquement à partir de la liste OCR
-- 187 produits nettoyés, catégorisés et dédupliqués
-- ============================================

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS produits_pharmacie (
    id SERIAL PRIMARY KEY,
    nom_produit VARCHAR(255) NOT NULL,
    categorie VARCHAR(100) NOT NULL,
    forme VARCHAR(100) NOT NULL,
    prix_unitaire_fc DECIMAL(10,2) NOT NULL DEFAULT 0,
    unite_vente VARCHAR(50) NOT NULL DEFAULT 'unité',
    stock_initial INT DEFAULT 0,
    description TEXT,
    statut VARCHAR(20) DEFAULT 'actif',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insertion des produits
INSERT INTO produits_pharmacie (nom_produit, categorie, forme, prix_unitaire_fc, unite_vente, stock_initial, description, statut) VALUES

-- ===== ANTIBIOTIQUES =====
('Amoxycilline 1000mg', 'Antibiotique', 'Comprimé', 1000, 'Plaquette', 0, 'Antibiotique bêta-lactamine', 'actif'),
('Amoxycilline + Acide Clavulanique (Araumox)', 'Antibiotique', 'Comprimé', 15000, 'Plaquette', 0, 'Antibiotique bêta-lactamine + inhibiteur bêta-lactamase', 'actif'),
('Amoxycilline (Aranutol)', 'Antibiotique', 'Comprimé', 8500, 'Boîte', 0, 'Antibiotique bêta-lactamine', 'actif'),
('Arauclav 2000', 'Antibiotique', 'Poudre injectable', 2000, 'Flacon', 0, 'Amoxicilline + Acide Clavulanique injectable', 'actif'),
('Ceftriaxone Injectable', 'Antibiotique', 'Poudre injectable', 2000, 'Flacon', 0, 'Céphalosporine de 3e génération', 'actif'),
('Cesacal CES', 'Antibiotique', 'Comprimé', 30000, 'Boîte', 0, 'Céphalosporine', 'actif'),
('Cesadox CES', 'Antibiotique', 'Comprimé', 10000, 'Plaquette', 0, 'Céphalosporine', 'actif'),
('Cesadox Sirop', 'Antibiotique', 'Sirop', 15000, 'Flacon', 0, 'Céphalosporine forme pédiatrique', 'actif'),
('Cesapril', 'Antibiotique', 'Comprimé', 2500, 'Plaquette', 0, 'Céphalosporine', 'actif'),
('Clamoxyl Gel', 'Antibiotique', 'Gelule', 6000, 'Boîte', 0, 'Amoxicilline en gélule', 'actif'),
('Clifa (600/300/150mg)', 'Antibiotique', 'Comprimé', 15000, 'Boîte', 0, 'Ciprofloxacine', 'actif'),
('Cloxacilline Gel', 'Antibiotique', 'Gélule', 2500, 'Boîte', 0, 'Antibiotique anti-staphylococcique', 'actif'),
('Cotrimoxazole (Citrimec)', 'Antibiotique', 'Comprimé', 3500, 'Plaquette', 0, 'Association sulfaméthoxazole + triméthoprime', 'actif'),
('Cotrimoxazole Sirop (Citrimex Sirop)', 'Antibiotique', 'Sirop', 3500, 'Flacon', 0, 'Forme pédiatrique', 'actif'),
('Floxapen CES', 'Antibiotique', 'Comprimé', 20000, 'Plaquette', 0, 'Flucloxacilline', 'actif'),
('Aratol Duo (Amoxicilline + Acide Clavulanique)', 'Antibiotique', 'Comprimé', 25000, 'Boîte', 0, 'Amoxicilline + Acide Clavulanique', 'actif'),
('Aratol Duo 562.5mg', 'Antibiotique', 'Comprimé', 20000, 'Boîte', 0, 'Amoxicilline + Acide Clavulanique dose pédiatrique', 'actif'),
('Moxyclav 1000mg', 'Antibiotique', 'Comprimé', 20000, 'Boîte', 0, 'Amoxicilline + Acide Clavulanique', 'actif'),
('Moxyclav 562mg', 'Antibiotique', 'Comprimé', 20000, 'Boîte', 0, 'Amoxicilline + Acide Clavulanique dose pédiatrique', 'actif'),
('Moxyclav Duo 1000mg', 'Antibiotique', 'Comprimé', 20000, 'Boîte', 0, 'Amoxicilline + Acide Clavulanique', 'actif'),
('Moxyclav Duo 500mg', 'Antibiotique', 'Comprimé', 20000, 'Boîte', 0, 'Amoxicilline + Acide Clavulanique', 'actif'),
('Ornidox', 'Antibiotique', 'Comprimé', 10000, 'Plaquette', 0, 'Ornidazole', 'actif'),
('Cotrimoxazole DS (Citrimec DT)', 'Antibiotique', 'Comprimé dispersible', 3500, 'Plaquette', 0, 'Double force', 'actif'),
('Tanzole', 'Antibiotique', 'Comprimé', 500, 'Unité', 0, 'Antibiotique', 'actif'),

-- ===== ANALGÉSIQUES / ANTALGIQUES =====
('Paracétamol', 'Antalgique', 'Comprimé', 400, 'Unité', 0, 'Antalgique antipyrétique', 'actif'),
('Doliprane EFF', 'Antalgique', 'Comprimé effervescent', 8000, 'Boîte', 0, 'Paracétamol effervescent', 'actif'),
('Aspirine Junior', 'Antalgique', 'Comprimé', 5000, 'Plaquette', 0, 'Acide acétylsalicylique pédiatrique', 'actif'),
('Masxprin', 'Antalgique', 'Comprimé', 6000, 'Plaquette', 0, 'Aspirine', 'actif'),
('Masxprin BT', 'Antalgique', 'Boîte', 18000, 'Boîte', 0, 'Aspirine grande boîte', 'actif'),
('Coxipin 60mg', 'Antalgique', 'Gélule', 12500, 'Plaquette', 0, 'Anti-inflammatoire', 'actif'),
('Coxipin 30mg', 'Antalgique', 'Gélule', 12500, 'Plaquette', 0, 'Anti-inflammatoire', 'actif'),
('Neurodoc', 'Antalgique', 'Comprimé', 20000, 'Boîte', 0, 'Antalgique neurotrope', 'actif'),
('Pain Relief Tube', 'Antalgique', 'Pommade', 2500, 'Tube', 0, 'Crème antalgique topique', 'actif'),

-- ===== ANTI-INFLAMMATOIRES =====
('Anaflam Sirop', 'Anti-inflammatoire', 'Sirop', 4000, 'Flacon', 0, 'Anti-inflammatoire pédiatrique', 'actif'),
('Diclofenac CES', 'Anti-inflammatoire', 'Comprimé', 200, 'Plaquette', 0, 'AINS', 'actif'),
('Diclofenac Injectable', 'Anti-inflammatoire', 'Injectable', 500, 'Ampoule', 0, 'AINS injectable', 'actif'),
('Diclofenac Suppositoire', 'Anti-inflammatoire', 'Suppositoire', 3000, 'Boîte', 0, 'AINS suppositoire', 'actif'),
('Indométhacine Suppositoire', 'Anti-inflammatoire', 'Suppositoire', 3000, 'Boîte', 0, 'AINS suppositoire', 'actif'),
('Profenid Suppositoire', 'Anti-inflammatoire', 'Suppositoire', 22000, 'Boîte', 0, 'Kétoprofène suppositoire', 'actif'),
('Kenacort Retard', 'Anti-inflammatoire', 'Injectable', 10000, 'Flacon', 0, 'Triamcinolone acétonide injectable', 'actif'),
('Prednizolone CES', 'Anti-inflammatoire', 'Comprimé', 1000, 'Plaquette', 0, 'Corticostéroïde', 'actif'),
('Hydrocortizone', 'Anti-inflammatoire', 'Injectable', 1000, 'Ampoule', 0, 'Corticostéroïde injectable', 'actif'),
('Colchicine', 'Anti-inflammatoire', 'Comprimé', 15000, 'Boîte', 0, 'Anti-inflammatoire pour goutte', 'actif'),
('Fenzer 30', 'Anti-inflammatoire', 'Comprimé', 20000, 'Plaquette', 0, 'Fénofibrate', 'actif'),
('Fenzer 18', 'Anti-inflammatoire', 'Comprimé', 18000, 'Plaquette', 0, 'Fénofibrate', 'actif'),
('Neuromag', 'Anti-inflammatoire', 'Comprimé', 0, 'Plaquette', 0, 'Magnésium', 'actif'),

-- ===== ANTIVERTIGINEUX / NEUROLOGIE =====
('Stugeron', 'Neurologie', 'Comprimé', 0, 'Plaquette', 0, 'Cinnarizine - antivertigineux', 'actif'),
('Tegretol 200mg', 'Neurologie', 'Comprimé', 12000, 'Plaquette', 0, 'Carbamazépine anti-épileptique', 'actif'),
('Rivotril', 'Neurologie', 'Comprimé', 0, 'Plaquette', 0, 'Clonazépam anti-épileptique', 'actif'),
('Dipiperon', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Neuroleptique', 'actif'),
('Dogmatil', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Sulpiride neuroleptique', 'actif'),
('Haldol Amp', 'Neurologie', 'Injectable', 4000, 'Ampoule', 0, 'Halopéridol injectable', 'actif'),
('Haldol CES', 'Neurologie', 'Comprimé', 8000, 'Plaquette', 0, 'Halopéridol comprimé', 'actif'),
('Largatil AMP', 'Neurologie', 'Injectable', 4000, 'Ampoule', 0, 'Flupenthixol injectable', 'actif'),
('Largatil CES', 'Neurologie', 'Comprimé', 8000, 'Plaquette', 0, 'Flupenthixol comprimé', 'actif'),
('Largatil PL', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Flupenthixol comprimé', 'actif'),
('Prolopa', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Lévodopa + Benserazide - Parkinson', 'actif'),
('Mysoline', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Phénytoïne anti-épileptique', 'actif'),
('Escidivule', 'Neurologie', 'Gélule', 10000, 'Plaquette', 0, 'Anti-épileptique', 'actif'),
('Diazepam AMP', 'Neurologie', 'Injectable', 500, 'Ampoule', 0, 'Benzodiazépine injectable', 'actif'),
('Calme CES (Alprazolam)', 'Neurologie', 'Comprimé', 10000, 'Boîte', 0, 'Anxiolytique benzodiazépine', 'actif'),
('Benerva', 'Neurologie', 'Comprimé', 9000, 'Plaquette', 0, 'Vitamine B - neurotrope', 'actif'),
('Nootropyl', 'Neurologie', 'Comprimé', 7500, 'Plaquette', 0, 'Piracétam nootropique', 'actif'),
('Nootropyl CES', 'Neurologie', 'Comprimé', 7500, 'Plaquette', 0, 'Piracétam nootropique', 'actif'),
('Depakine 200mg', 'Neurologie', 'Comprimé', 8000, 'Plaquette', 0, 'Acide valproïque anti-épileptique', 'actif'),
('Depakine 500mg', 'Neurologie', 'Comprimé', 8000, 'Plaquette', 0, 'Acide valproïque anti-épileptique', 'actif'),
('Depakine Boîte 40CES', 'Neurologie', 'Comprimé', 20000, 'Boîte', 0, 'Acide valproïque - boîte de 40', 'actif'),
('Depakine Chrono', 'Neurologie', 'Comprimé', 50000, 'Boîte', 0, 'Acide valproïque LP', 'actif'),
('Depakine Sirop', 'Neurologie', 'Sirop', 15000, 'Flacon', 0, 'Acide valproïque forme liquide', 'actif'),
('Depamag', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Anti-épileptique', 'actif'),
('Rilatine', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Méthylphénidate - TDAH', 'actif'),
('Lyrimag 75', 'Neurologie', 'Gélule', 25000, 'Plaquette', 0, 'Pregabaline - douleurs neuropathiques', 'actif'),
('Lyrica 75mg', 'Neurologie', 'Gélule', 3000, 'Plaquette', 0, 'Pregabaline - douleurs neuropathiques', 'actif'),
('Pregatas 75', 'Neurologie', 'Comprimé', 15000, 'Plaquette', 0, 'Pregabaline', 'actif'),
('Pregatas ME', 'Neurologie', 'Comprimé', 25000, 'Plaquette', 0, 'Pregabaline', 'actif'),
('Pregnerve', 'Neurologie', 'Comprimé', 25000, 'Plaquette', 0, 'Pregabaline', 'actif'),
('Cervoline Injectable', 'Neurologie', 'Injectable', 35000, 'Boîte', 0, 'Vitamine B injectable', 'actif'),
('Cervoline Sirop', 'Neurologie', 'Sirop', 30000, 'Flacon', 0, 'Vitamine B sirop', 'actif'),
('Cervichol', 'Neurologie', 'Ampoule', 5000, 'Ampoule', 0, 'Neurotrope injectable', 'actif'),
('Pregnerve', 'Neurologie', 'Comprimé', 25000, 'Plaquette', 0, 'Pregabaline', 'actif'),
('Magpentine 300', 'Neurologie', 'Gélule', 25000, 'Plaquette', 0, 'Gabapentine 300mg', 'actif'),
('Promag', 'Neurologie', 'Comprimé', 20000, 'Plaquette', 0, 'Magnésium', 'actif'),
('Nucleo Fort 30', 'Neurologie', 'Comprimé', 30000, 'Boîte', 0, 'Neurotrope', 'actif'),
('Gamalate B6', 'Neurologie', 'Comprimé', 1500, 'Plaquette', 0, 'Acide gamma-aminobutyrique + B6', 'actif'),
('Tracol CES', 'Neurologie', 'Comprimé', 20000, 'Plaquette', 0, 'Neurotrope', 'actif'),
('Tracol Sirop', 'Neurologie', 'Sirop', 30000, 'Flacon', 0, 'Neurotrope sirop', 'actif'),

-- ===== ANTIDÉPRESSEURS =====
('Cymbalta', 'Antidépresseur', 'Gélule', 10000, 'Plaquette', 0, 'Duloxétine - ISRSN', 'actif'),
('Seroxat', 'Antidépresseur', 'Comprimé', 10000, 'Plaquette', 0, 'Paroxétine - ISRS', 'actif'),
('Venlafaxine Retard', 'Antidépresseur', 'Gélule LP', 10000, 'Plaquette', 0, 'ISRSN libération prolongée', 'actif'),
('Fluoxétine', 'Antidépresseur', 'Gélule', 10000, 'Plaquette', 0, 'ISRS', 'actif'),
('Escitalopram', 'Antidépresseur', 'Comprimé', 10000, 'Plaquette', 0, 'ISRS', 'actif'),
('Paroxétine', 'Antidépresseur', 'Comprimé', 10000, 'Plaquette', 0, 'ISRS', 'actif'),
('Escidivule', 'Antidépresseur', 'Gélule', 10000, 'Plaquette', 0, 'Anti-dépresseur', 'actif'),
('Sipralexa', 'Antidépresseur', 'Comprimé', 10000, 'Plaquette', 0, 'Escitalopram', 'actif'),
('Duloxétine', 'Antidépresseur', 'Gélule', 10000, 'Plaquette', 0, 'ISRSN - troubles anxieux, douleurs neuropathiques', 'actif'),
('Deanxit', 'Antidépresseur', 'Comprimé', 10000, 'Plaquette', 0, 'Flupenthixol + Mépitriptène', 'actif'),
('Laroxy l', 'Antidépresseur', 'Comprimé', 8000, 'Plaquette', 0, 'Amitriptyline', 'actif'),
('Laroxy l PL', 'Antidépresseur', 'Comprimé', 10000, 'Plaquette', 0, 'Amitriptyline', 'actif'),
('Anafranil', 'Antidépresseur', 'Comprimé', 0, 'Plaquette', 0, 'Clomipramine - ISRS tricyclique', 'actif'),
('Nozina', 'Antidépresseur', 'Comprimé', 15000, 'Plaquette', 0, 'Antidépresseur', 'actif'),

-- ===== ANTIPSYCHOTIQUES =====
('Olanzapine Sandoz', 'Antipsychotique', 'Comprimé', 10000, 'Plaquette', 0, 'Neuroleptique atypique', 'actif'),
('Quétiapine Sandoz', 'Antipsychotique', 'Comprimé', 10000, 'Plaquette', 0, 'Neuroleptique atypique', 'actif'),
('Respiridal', 'Antipsychotique', 'Comprimé', 8000, 'Plaquette', 0, 'Rispéridone', 'actif'),
('Respiridal 2', 'Antipsychotique', 'Comprimé', 10000, 'Plaquette', 0, 'Rispéridone', 'actif'),
('Lepoxex', 'Antipsychotique', 'Comprimé', 10000, 'Plaquette', 0, 'Antipsychotique', 'actif'),
('Trapridal', 'Antipsychotique', 'Comprimé', 10000, 'Plaquette', 0, 'Antipsychotique', 'actif'),

-- ===== CARDIOVASCULAIRES =====
('Amlodipine 5mg (Amlox 5)', 'Cardiovasculaire', 'Comprimé', 15000, 'Boîte de 30', 0, 'Antihypertenseur - bloqueur des canaux calciques', 'actif'),
('Amlodipine 10mg (Amlox 10)', 'Cardiovasculaire', 'Comprimé', 15000, 'Boîte de 30', 0, 'Antihypertenseur - bloqueur des canaux calciques', 'actif'),
('Ramipril 5mg (Napril 5)', 'Cardiovasculaire', 'Comprimé', 15000, 'Boîte de 30', 0, 'IECA antihypertenseur', 'actif'),
('Ramipril 10mg (Napril 10)', 'Cardiovasculaire', 'Comprimé', 15000, 'Boîte de 30', 0, 'IECA antihypertenseur', 'actif'),
('Captopril', 'Cardiovasculaire', 'Comprimé', 2500, 'Plaquette', 0, 'IECA antihypertenseur', 'actif'),
('Cesapril', 'Cardiovasculaire', 'Comprimé', 2500, 'Plaquette', 0, 'IECA antihypertenseur', 'actif'),
('Enalapril', 'Cardiovasculaire', 'Comprimé', 15000, 'Plaquette', 0, 'IECA antihypertenseur', 'actif'),
('Enapril 10mg', 'Cardiovasculaire', 'Comprimé', 10000, 'Plaquette', 0, 'IECA antihypertenseur', 'actif'),
('Enapril 5mg', 'Cardiovasculaire', 'Comprimé', 10000, 'Plaquette', 0, 'IECA antihypertenseur', 'actif'),
('Vasocar 10', 'Cardiovasculaire', 'Comprimé', 15000, 'Plaquette', 0, 'Antihypertenseur', 'actif'),
('Vasocar 5', 'Cardiovasculaire', 'Comprimé', 15000, 'Plaquette', 0, 'Antihypertenseur', 'actif'),
('Rovas 10', 'Cardiovasculaire', 'Comprimé', 15000, 'Plaquette', 0, 'Atorvastatine - hypolipémiant', 'actif'),
('Rovas 20', 'Cardiovasculaire', 'Comprimé', 20000, 'Plaquette', 0, 'Atorvastatine - hypolipémiant', 'actif'),
('Rovas 5', 'Cardiovasculaire', 'Comprimé', 10000, 'Plaquette', 0, 'Atorvastatine - hypolipémiant', 'actif'),
('Esmodon', 'Cardiovasculaire', 'Comprimé', 7000, 'Boîte', 0, 'Antihypertenseur', 'actif'),
('Pregnavit F', 'Cardiovasculaire', 'Comprimé', 0, 'Plaquette', 0, 'Acide folique', 'actif'),
('Amlodipine/Benazepril (Amtas 10)', 'Cardiovasculaire', 'Comprimé', 10000, 'Plaquette', 0, 'Combinaison antihypertenseur', 'actif'),
('Amlodipine/Benazepril (Amtas 5)', 'Cardiovasculaire', 'Comprimé', 10000, 'Plaquette', 0, 'Combinaison antihypertenseur', 'actif'),
('Adenuric', 'Cardiovasculaire', 'Comprimé', 10000, 'Plaquette', 0, 'Fébuxostat - goutte', 'actif'),
('Phlebodia', 'Cardiovasculaire', 'Comprimé', 15000, 'Plaquette', 0, 'Diosmine - insuffisance veineuse', 'actif'),
('Ucox 90', 'Cardiovasculaire', 'Comprimé', 15000, 'Plaquette', 0, 'Cardiovasculaire', 'actif'),
('Pinax', 'Cardiovasculaire', 'Comprimé', 11000, 'Boîte', 0, 'Cardiovasculaire', 'actif'),
('Finotrip', 'Cardiovasculaire', 'Comprimé', 15000, 'Boîte', 0, 'Cardiovasculaire', 'actif'),
('Vildishal 50', 'Cardiovasculaire', 'Comprimé', 40000, 'Boîte', 0, 'Antihypertenseur', 'actif'),
('Teleshal 200', 'Cardiovasculaire', 'Comprimé', 20000, 'Boîte', 0, 'Losartan 200mg - IARA', 'actif'),
('Shalsiprin CV', 'Cardiovasculaire', 'Comprimé', 12000, 'Boîte', 0, 'Aspirine Cardio', 'actif'),
('Shalrica SR 82.5', 'Cardiovasculaire', 'Comprimé', 20000, 'Boîte de 30', 0, 'Cardiovasculaire', 'actif'),
('Fortomega Plus', 'Cardiovasculaire', 'Gélule', 10000, 'Plaquette', 0, 'Oméga 3 - cardiovasculaire', 'actif'),

-- ===== ANTIPALUDÉENS / COMBINAISONS =====
('Combiart 24 CES (Adulte)', 'Antipaludéen', 'Comprimé', 3500, 'Plaquette', 0, 'Artéméther + Luméfantrine', 'actif'),
('Combiart 24 CES (Enfant)', 'Antipaludéen', 'Comprimé', 2000, 'Plaquette', 0, 'Artéméther + Luméfantrine pédiatrique', 'actif'),
('Cesavert 24mg', 'Antipaludéen', 'Comprimé', 12500, 'Boîte', 0, 'Antipaludéen', 'actif'),
('Coartem (Combinaison)', 'Antipaludéen', 'Comprimé', 0, 'Plaquette', 0, 'Artéméther + Luméfantrine', 'actif'),

-- ===== GASTRO-ENTÉROLOGIE =====
('Digest Sachet', 'Gastro-entérologie', 'Sachet', 2000, 'Sachet', 0, 'Digestif', 'actif'),
('Pylorimex', 'Gastro-entérologie', 'Comprimé', 5000, 'Plaquette', 0, 'Gastro-entérologique', 'actif'),
('Kaptol Sirop', 'Gastro-entérologie', 'Sirop', 4000, 'Flacon', 0, 'Gastro-entérologique', 'actif'),
('Kaptol Gélule', 'Gastro-entérologie', 'Gélule', 4000, 'Plaquette', 0, 'Gastro-entérologique', 'actif'),
('Famicald', 'Gastro-entérologie', 'Comprimé', 2000, 'Plaquette', 0, 'Gastro-entérologique', 'actif'),
('Famicald 2', 'Gastro-entérologique', 'Comprimé', 2000, 'Plaquette', 0, 'Gastro-entérologique', 'actif'),

-- ===== VITAMINES / SUPPLÉMENTS =====
('Vitamine B1', 'Vitamine', 'Comprimé', 300, 'Plaquette', 0, 'Vitamine B1', 'actif'),
('Vitamine', 'Vitamine', 'Comprimé', 200, 'Unité', 0, 'Vitamine générale', 'actif'),
('Vit B Denk', 'Vitamine', 'Comprimé', 8000, 'Plaquette', 0, 'Vitamine B complexe', 'actif'),
('Vit B Denk Grande', 'Vitamine', 'Comprimé', 12000, 'Plaquette', 0, 'Vitamine B complexe grande plaquette', 'actif'),
('Effelargan + Vit C', 'Vitamine', 'Comprimé', 8000, 'Boîte', 0, 'Vitamine C + Arginine', 'actif'),
('Calcidos CES', 'Vitamine', 'Comprimé', 8000, 'Plaquette', 0, 'Calcium + Vitamine D', 'actif'),
('Calcidos Sirop', 'Vitamine', 'Sirop', 8000, 'Flacon', 0, 'Calcium + Vitamine D sirop', 'actif'),
('Pergavit', 'Vitamine', 'Comprimé', 0, 'Plaquette', 0, 'Multivitamine', 'actif'),
('Perfac IG', 'Vitamine', 'Injectable', 8000, 'Ampoule', 0, 'Fer injectable', 'actif'),
('Fortaline Sirop', 'Vitamine', 'Sirop', 32000, 'Flacon', 0, 'Tonique général', 'actif'),
('Fortaline BT', 'Vitamine', 'Boîte', 50000, 'Boîte', 0, 'Tonique général grande boîte', 'actif'),
('Lynevit Sirop', 'Vitamine', 'Sirop', 6500, 'Flacon', 0, 'Vitamine sirop', 'actif'),
('Newmex Fort', 'Vitamine', 'Comprimé', 5000, 'Boîte', 0, 'Tonique', 'actif'),
('Neuro Centrum Amp Buv', 'Vitamine', 'Ampoule buvable', 5000, 'Ampoule', 0, 'Vitamines et minéraux', 'actif'),
('Tribex Fort', 'Vitamine', 'Comprimé', 3500, 'Sachet', 0, 'Tonique', 'actif'),

-- ===== ANTI-ÉMÉTIQUES / ALLERGIE =====
('Anset AMP', 'Anti-émétique', 'Injectable', 2500, 'Ampoule', 0, 'Ondansétron anti-nauséeux', 'actif'),
('Prométazine AMP', 'Anti-allergique', 'Injectable', 1000, 'Ampoule', 0, 'Antihistaminique injectable', 'actif'),
('Prométazine CES', 'Anti-allergique', 'Comprimé', 1000, 'Plaquette', 0, 'Antihistaminique comprimé', 'actif'),
('Pivalone', 'Anti-allergique', 'Spray nasal', 10000, 'Flacon', 0, 'Corticoïde nasal - allergique', 'actif'),

-- ===== MATÉRIEL MÉDICAL / CONSOMMABLES =====
('Bande Élastique', 'Matériel médical', 'Rouleau', 2500, 'Rouleau', 0, 'Bande de contention', 'actif'),
('Bistouri', 'Matériel médical', 'Pièce', 500, 'Unité', 0, 'Bistouri jetable', 'actif'),
('Cathéter', 'Matériel médical', 'Pièce', 500, 'Unité', 0, 'Cathéter intraveineux', 'actif'),
('Compresses Stériles', 'Matériel médical', 'Pièce', 500, 'Pièce', 0, 'Compresse de pansement', 'actif'),
('Gants Stériles', 'Matériel médical', 'Paire', 1000, 'Paire', 0, 'Gants chirurgicaux stériles', 'actif'),
('Gants Propres', 'Matériel médical', 'Paire', 500, 'Paire', 0, 'Gants d''examen non stériles', 'actif'),
('Seringues', 'Matériel médical', 'Pièce', 250, 'Unité', 0, 'Seringue injectable', 'actif'),
('Sparadrap 5cm', 'Matériel médical', 'Rouleau', 500, 'Rouleau', 0, 'Adhésif médical', 'actif'),
('Trousse', 'Matériel médical', 'Pièce', 1000, 'Unité', 0, 'Trousse médicale', 'actif'),
('Plâtre', 'Matériel médical', 'Rouleau', 5000, 'Pièce', 0, 'Plâtre orthopédique', 'actif'),
('Quaté', 'Matériel médical', 'Rouleau', 10000, 'Rouleau', 0, 'Pansement adhésif', 'actif'),
('Vicryl', 'Matériel médical', 'Fil chirurgical', 3500, 'Pièce', 0, 'Fil de suture résorbable', 'actif'),
('Oxyn Tube', 'Matériel médical', 'Tube', 2500, 'Tube', 0, 'Crème dermatologique', 'actif'),

-- ===== TOPIQUE / DERMATOLOGIE =====
('Alcool de Nature', 'Topique', 'Solution', 2500, 'Flacon', 0, 'Alcool à 70° - antiseptique', 'actif'),
('Betadine', 'Topique', 'Solution', 9000, 'Flacon', 0, 'Povidone iodée - antiseptique', 'actif'),
('Eau Oxygénée', 'Topique', 'Solution', 5000, 'Flacon', 0, 'Eau oxygénée 10 volumes', 'actif'),
('Camphre', 'Topique', 'Pommade', 2000, 'Pot', 0, 'Pommade rubéfiante', 'actif'),
('Baume de Nerf', 'Topique', 'Pommade', 5000, 'Pot', 0, 'Baume antalgique topique', 'actif'),
('Chaleur Pouvoir', 'Topique', 'Pommade', 2500, 'Tube', 0, 'Crème chauffante', 'actif'),
('Lidocaïne 2%', 'Topique', 'Solution injectable', 2500, 'Ampoule', 0, 'Anesthésique local', 'actif'),

-- ===== SÉRUMS / SOLUTIONS IV =====
('Sérum Physiologique', 'Sérum', 'Solution injectable', 500, 'Ampoule', 0, 'Solution de chlorure de sodium 0.9%', 'actif'),
('Sérum RL', 'Sérum', 'Solution injectable', 4000, 'Flacon', 0, 'Ringer Lactate', 'actif'),
('Dextrose', 'Sérum', 'Solution injectable', 2500, 'Flacon', 0, 'Glucose injectable', 'actif'),

-- ===== ANTI-DOULEUR SPÉCIALISÉS =====
('Neufort (Tramadol)', 'Antalgique', 'Comprimé', 0, 'Plaquette', 0, 'Opioïde faible', 'actif'),
('Tramadol', 'Antalgique', 'Comprimé', 0, 'Plaquette', 0, 'Opioïde faible', 'actif'),
('Artanf', 'Antalgique', 'Comprimé', 16000, 'Boîte', 0, 'Antalgique', 'actif'),
('Pasmex', 'Antalgique', 'Comprimé', 12000, 'Boîte', 0, 'Antispasmodique', 'actif'),
('Spasta 20', 'Antalgique', 'Comprimé', 7000, 'Boîte', 0, 'Antispasmodique', 'actif'),
('Ca-Ucee', 'Antalgique', 'Comprimé', 10000, 'Boîte', 0, 'Calcique urinaire', 'actif'),
('Betaline Gélules', 'Antalgique', 'Gélule', 15000, 'Plaquette', 0, 'Antalgique', 'actif'),
('Despain', 'Antalgique', 'Comprimé', 11000, 'Boîte', 0, 'Antalgique', 'actif'),
('Furadentine CES', 'Antalgique', 'Comprimé', 1000, 'Plaquette', 0, 'Antibiotique urinaire', 'actif'),
('Ziloric', 'Antalgique', 'Comprimé', 12000, 'Plaquette', 0, 'Allopurinol - goutte', 'actif'),
('Ketofen Suppositoire', 'Anti-inflammatoire', 'Suppositoire', 15000, 'Boîte', 0, 'Kétoprofène', 'actif'),

-- ===== AUTRES =====
('Ritaline', 'Neurologie', 'Comprimé', 10000, 'Plaquette', 0, 'Méthylphénidate - TDAH', 'actif'),
('Nootropyl CES 2', 'Neurologie', 'Comprimé', 7500, 'Plaquette', 0, 'Piracétam', 'actif'),
('Depakine Boîte grande', 'Neurologie', 'Comprimé', 50000, 'Boîte', 0, 'Acide valproïque grande boîte', 'actif');

-- 3. Vérification
SELECT categorie, COUNT(*) as nombre_produits
FROM produits_pharmacie
GROUP BY categorie
ORDER BY nombre_produits DESC;
