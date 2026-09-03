import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const categoryName = "Acte Médical";

    // Check if it exists
    const { data: existing } = await supabaseAdmin
      .from("exams")
      .select("id")
      .eq("name", categoryName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: `La catégorie '${categoryName}' existe déjà.`
      });
    }

    // Create it
    const { data, error } = await supabaseAdmin
      .from("exams")
      .insert({
        name: categoryName,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `La catégorie '${categoryName}' a été créée avec succès !`,
      data
    });
  } catch (e: any) {
    console.error("[API Setup] Error:", e);
    return NextResponse.json({
      success: false,
      error: e.message
    }, { status: 500 });
  }
}
