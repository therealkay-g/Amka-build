
import { supabaseAdmin } from "../lib/supabase-admin";

async function setup() {
  const categoryName = "Acte Médical";
  console.log(`Checking if '${categoryName}' exists...`);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("exams")
    .select("id")
    .eq("name", categoryName)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching exam:", fetchError);
    process.exit(1);
  }

  if (existing) {
    console.log(`Category '${categoryName}' already exists (ID: ${existing.id}).`);
    process.exit(0);
  }

  console.log(`Creating '${categoryName}'...`);
  const { data, error: insertError } = await supabaseAdmin
    .from("exams")
    .insert({
      name: categoryName,
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting exam:", insertError);
    process.exit(1);
  }

  console.log(`Success! Category '${categoryName}' created with ID: ${data.id}`);
}

setup().catch(console.error);
