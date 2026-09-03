
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  console.log("Attempting to create 'Acte Médical' using service role...");

  const { data: existing, error: fetchError } = await supabase
    .from("exams")
    .select("id")
    .eq("name", "Acte Médical")
    .maybeSingle();

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    process.exit(1);
  }

  if (existing) {
    console.log("Already exists!");
    process.exit(0);
  }

  const { data, error: insertError } = await supabase
    .from("exams")
    .insert({ name: "Acte Médical", is_active: true })
    .select()
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    process.exit(1);
  }

  console.log("Successfully created!");
}

setup();
