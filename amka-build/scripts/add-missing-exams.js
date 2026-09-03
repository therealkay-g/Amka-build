
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addMissingExams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  console.log("🚀 Adding missing lab exams...");

  // 1. Get the Laboratoire category ID
  const { data: category, error: catError } = await supabase
    .from("exam_categories")
    .select("id")
    .eq("name", "Laboratoire")
    .single();

  if (catError || !category) {
    console.error("Could not find 'Laboratoire' category:", catError);
    process.exit(1);
  }

  const labId = category.id;

  const examsToAdd = [
    { name: "Glycémie", subcategory: "Biochimie", display_order: 120 },
    { name: "VS2", subcategory: "Hématologie", display_order: 130 },
  ];

  for (const exam of examsToAdd) {
    const { error: insertError } = await supabase
      .from("exams")
      .insert({
        category_id: labId,
        name: exam.name,
        subcategory: exam.subcategory,
        display_order: exam.display_order,
        is_active: true,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`Exam ${exam.name} already exists, skipping...`);
      } else {
        console.error(`Error adding ${exam.name}:`, insertError.message);
      }
    } else {
      console.log(`✅ Added ${exam.name} to Laboratoire.`);
    }
  }
}

addMissingExams().catch(console.error);
