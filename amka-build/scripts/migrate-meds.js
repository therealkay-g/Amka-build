
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  console.log("🚀 Starting migration: produits_pharmacie -> medications...");

  // 1. Fetch all products from the catalogue
  const { data: products, error: fetchError } = await supabase
    .from("produits_pharmacie")
    .select("*");

  if (fetchError) {
    console.error("Error fetching catalogue products:", fetchError);
    process.exit(1);
  }

  console.log(`Found ${products?.length || 0} products in catalogue.`);

  if (!products || products.length === 0) {
    console.log("No products to migrate.");
    return;
  }

  let migratedCount = 0;
  let updatedCount = 0;

  for (const product of products) {
    // Determine threshold
    const stock = product.stock_initial || 0;
    const threshold = stock > 0 ? Math.max(Math.floor(stock / 2), 5) : 10;
    const isActive = product.statut === 'actif';

    const payload = {
      name: product.nom_produit,
      category: product.categorie,
      unit: product.unite_vente,
      price: product.prix_unitaire_fc,
      stock: stock,
      threshold: threshold,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    // Check if medication already exists by name
    const { data: existing } = await supabase
      .from("medications")
      .select("id")
      .eq("name", product.nom_produit)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("medications")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) console.error(`Error updating ${product.nom_produit}:`, updateError.message);
      else updatedCount++;
    } else {
      const { error: insertError } = await supabase
        .from("medications")
        .insert(payload);

      if (insertError) console.error(`Error inserting ${product.nom_produit}:`, insertError.message);
      else migratedCount++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`- New medications added: ${migratedCount}`);
  console.log(`- Existing medications updated: ${updatedCount}`);
}

migrate().catch(console.error);
