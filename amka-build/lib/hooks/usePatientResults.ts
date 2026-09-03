import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Profile } from "@/lib/types";

export function usePatientResults() {
  const [patientsWithResults, setPatientsWithResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  const fetchPatientsWithResults = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setUserProfile(profile as Profile);
    const role = profile?.role;

    // We want patients who have at least one terminated exam
    let query = supabase
      .from("consultation_exams")
      .select(`
        consultations (
          medecin_id,
          patients (id, nom, prenom, numero_dossier)
        )
      `)
      .eq("status", "TERMINE");

    // Only filter by doctor if the user is NOT the Medical Director
    if (role !== "MEDECIN_DIRECTEUR") {
      query = query.eq("consultations.medecin_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching patients with results:", error);
    } else if (data) {
      const patientMap = new Map<string, Patient>();
      data.forEach((item: any) => {
        const p = item.consultations?.patients;
        if (p) {
          patientMap.set(p.id, p as Patient);
        }
      });
      setPatientsWithResults(Array.from(patientMap.values()).sort((a, b) => a.nom.localeCompare(b.nom)));
    }
    setLoading(false);
  }, []);

  const fetchResultsForPatient = useCallback(async (patient: Patient) => {
    setLoading(true);
    setSelectedPatient(patient);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Use the already fetched profile or fetch again if necessary
    let role = userProfile?.role;
    if (!role) {
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      role = prof?.role;
    }

    // Fetch terminated exams for this patient
    let query = supabase
      .from("consultation_exams")
      .select(`
        id,
        status,
        resulted_at,
        results,
        exams (name, exam_categories (name)),
        consultations (
          date_consultation,
          medecin_id,
          profiles (first_name, last_name)
        )
      `)
      .eq("status", "TERMINE")
      .eq("consultations.patient_id", patient.id);

    // Only filter by doctor if the user is NOT the Medical Director
    if (role !== "MEDECIN_DIRECTEUR") {
      query = query.eq("consultations.medecin_id", user.id);
    }

    const { data, error } = await query.order("resulted_at", { ascending: false });

    if (error) {
      console.error("Error fetching results for patient:", error);
    } else {
      setResults(data ?? []);
    }
    setLoading(false);
  }, [userProfile]);

  useEffect(() => {
    void fetchPatientsWithResults();
  }, [fetchPatientsWithResults]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patientsWithResults;
    const q = searchQuery.toLowerCase();
    return patientsWithResults.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      p.prenom.toLowerCase().includes(q) ||
      p.numero_dossier.toLowerCase().includes(q)
    );
  }, [patientsWithResults, searchQuery]);

  return {
    patientsWithResults: filteredPatients,
    selectedPatient,
    setSelectedPatient,
    results,
    loading,
    searchQuery,
    setSearchQuery,
    fetchResultsForPatient,
    refresh: fetchPatientsWithResults,
  };
}
