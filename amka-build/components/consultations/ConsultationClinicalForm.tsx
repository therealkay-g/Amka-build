"use client";

import type { ConsultationClinicalData, EtatGeneral } from "@/lib/consultation-clinical";
import { computeImc } from "@/lib/consultation-clinical";
import { cn } from "@/lib/utils";

type Props = {
  clinical: ConsultationClinicalData;
  onChange: (clinical: ConsultationClinicalData) => void;
  motif: string;
  onMotifChange: (motif: string) => void;
  diagnostic: string;
  onDiagnosticChange: (v: string) => void;
  traitement: string;
  onTraitementChange: (v: string) => void;
  readOnly?: boolean;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="medical-card p-6 space-y-4">
      <h3 className="text-base font-black text-primary border-b border-primary/20 pb-2">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  if (readOnly) {
    return (
      <div>
        <p className="label">{label}</p>
        <p className="text-sm text-text whitespace-pre-wrap mt-1 min-h-[1.5rem]">{value || "—"}</p>
      </div>
    );
  }
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        className="input-field min-h-[72px]"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  if (readOnly) {
    return (
      <div>
        <p className="label">{label}</p>
        <p className="text-sm font-semibold text-text mt-1">{value || "—"}</p>
      </div>
    );
  }
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input-field"
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function ConsultationClinicalForm({
  clinical,
  onChange,
  motif,
  onMotifChange,
  diagnostic,
  onDiagnosticChange,
  traitement,
  onTraitementChange,
  readOnly = false,
}: Props) {
  function patch<
    K extends Exclude<keyof ConsultationClinicalData, "hors_pharmacie">
  >(
    section: K,
    key: keyof ConsultationClinicalData[K],
    value: string | EtatGeneral
  ) {
    const next = {
      ...clinical,
      [section]: { ...clinical[section], [key]: value },
    };
    if (section === "examen_general" && (key === "poids" || key === "taille")) {
      const eg = next.examen_general;
      next.examen_general = {
        ...eg,
        imc: computeImc(
          key === "poids" ? String(value) : eg.poids,
          key === "taille" ? String(value) : eg.taille
        ),
      };
    }
    onChange(next);
  }

  const h = clinical.histoire_maladie;
  const g = clinical.examen_general;
  const n = clinical.examen_neurologique;
  const p = clinical.examen_psychiatrique;
  const t = clinical.examen_traumatologique;

  return (
    <div className="space-y-6">
      <Section title="II. Motif de consultation">
        {readOnly ? (
          <p className="text-sm whitespace-pre-wrap">{motif || "—"}</p>
        ) : (
          <textarea
            className="input-field min-h-[80px]"
            value={motif}
            onChange={(e) => onMotifChange(e.target.value)}
            placeholder="Motif principal de la consultation..."
            required
          />
        )}
      </Section>

      <Section title="III. Histoire de la maladie">
        <Field
          label="Début – évolution – traitements antérieurs – circonstances"
          value={h.debut_evolution}
          onChange={(v) => patch("histoire_maladie", "debut_evolution", v)}
          readOnly={readOnly}
        />
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Antécédents</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Médicaux" value={h.antecedents_medicaux} onChange={(v) => patch("histoire_maladie", "antecedents_medicaux", v)} readOnly={readOnly} rows={2} />
          <Field label="Chirurgicaux" value={h.antecedents_chirurgicaux} onChange={(v) => patch("histoire_maladie", "antecedents_chirurgicaux", v)} readOnly={readOnly} rows={2} />
          <Field label="Psychiatriques" value={h.antecedents_psychiatriques} onChange={(v) => patch("histoire_maladie", "antecedents_psychiatriques", v)} readOnly={readOnly} rows={2} />
          <Field label="Traumatiques" value={h.antecedents_traumatiques} onChange={(v) => patch("histoire_maladie", "antecedents_traumatiques", v)} readOnly={readOnly} rows={2} />
          <Field label="Familiaux" value={h.antecedents_familiaux} onChange={(v) => patch("histoire_maladie", "antecedents_familiaux", v)} readOnly={readOnly} rows={2} />
          <Field label="Allergies" value={h.allergies} onChange={(v) => patch("histoire_maladie", "allergies", v)} readOnly={readOnly} rows={2} />
          <Field label="Traitements habituels" value={h.traitements_habituelles} onChange={(v) => patch("histoire_maladie", "traitements_habituelles", v)} readOnly={readOnly} rows={2} />
        </div>
      </Section>

      <Section title="IV. Examen clinique général">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <InputField label="TA" value={g.ta} onChange={(v) => patch("examen_general", "ta", v)} readOnly={readOnly} placeholder="120/80" />
          <InputField label="FC" value={g.fc} onChange={(v) => patch("examen_general", "fc", v)} readOnly={readOnly} placeholder="/min" />
          <InputField label="FR" value={g.fr} onChange={(v) => patch("examen_general", "fr", v)} readOnly={readOnly} placeholder="/min" />
          <InputField label="T°" value={g.temperature} onChange={(v) => patch("examen_general", "temperature", v)} readOnly={readOnly} placeholder="°C" />
          <InputField label="SpO₂" value={g.spo2} onChange={(v) => patch("examen_general", "spo2", v)} readOnly={readOnly} placeholder="%" />
          <InputField label="Poids" value={g.poids} onChange={(v) => patch("examen_general", "poids", v)} readOnly={readOnly} placeholder="kg" />
          <InputField label="Taille" value={g.taille} onChange={(v) => patch("examen_general", "taille", v)} readOnly={readOnly} placeholder="cm" />
          <InputField label="IMC" value={g.imc} onChange={() => {}} readOnly disabled placeholder="auto" />
        </div>
        <div>
          <p className="label mb-2">État général</p>
          <div className="flex flex-wrap gap-4">
            {(["Bon", "Moyen", "Altere"] as const).map((opt) => (
              <label key={opt} className={cn("flex items-center gap-2 text-sm font-semibold", readOnly && g.etat_general !== opt && "opacity-40")}>
                <input
                  type="radio"
                  name="etat_general"
                  checked={g.etat_general === opt}
                  disabled={readOnly}
                  onChange={() => patch("examen_general", "etat_general", opt)}
                  className="accent-primary"
                />
                {opt === "Altere" ? "Altéré" : opt}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="V. Examen neurologique">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Conscience (Glasgow)" value={n.conscience_glasgow} onChange={(v) => patch("examen_neurologique", "conscience_glasgow", v)} readOnly={readOnly} rows={2} />
          <Field label="Orientation, langage, mémoire" value={[n.orientation, n.langage, n.memoire].filter(Boolean).join("\n")} onChange={(v) => {
            const [a, b, c] = v.split("\n");
            onChange({ ...clinical, examen_neurologique: { ...n, orientation: a ?? "", langage: b ?? "", memoire: c ?? "" } });
          }} readOnly={readOnly} />
          <Field label="Paires crâniennes I–XII" value={n.paires_craniennes} onChange={(v) => patch("examen_neurologique", "paires_craniennes", v)} readOnly={readOnly} />
        </div>
        <p className="text-xs font-bold text-muted">Force musculaire MRC (/5)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InputField label="MS D" value={n.force_ms_d} onChange={(v) => patch("examen_neurologique", "force_ms_d", v)} readOnly={readOnly} placeholder="/5" />
          <InputField label="MS G" value={n.force_ms_g} onChange={(v) => patch("examen_neurologique", "force_ms_g", v)} readOnly={readOnly} placeholder="/5" />
          <InputField label="MI D" value={n.force_mi_d} onChange={(v) => patch("examen_neurologique", "force_mi_d", v)} readOnly={readOnly} placeholder="/5" />
          <InputField label="MI G" value={n.force_mi_g} onChange={(v) => patch("examen_neurologique", "force_mi_g", v)} readOnly={readOnly} placeholder="/5" />
        </div>
        <Field label="Sensibilité, ROT, coordination, équilibre, marche, signes méningés, sphincters" value={[n.sensibilite, n.rot, n.coordination, n.equilibre, n.marche, n.signes_meninges, n.sphincters].filter(Boolean).join("\n")} onChange={(v) => {
          const parts = v.split("\n");
          onChange({
            ...clinical,
            examen_neurologique: {
              ...n,
              sensibilite: parts[0] ?? "",
              rot: parts[1] ?? "",
              coordination: parts[2] ?? "",
              equilibre: parts[3] ?? "",
              marche: parts[4] ?? "",
              signes_meninges: parts[5] ?? "",
              sphincters: parts[6] ?? "",
            },
          });
        }} readOnly={readOnly} rows={4} />
      </Section>

      <Section title="VI. Examen psychiatrique">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Présentation" value={p.presentation} onChange={(v) => patch("examen_psychiatrique", "presentation", v)} readOnly={readOnly} />
          <Field label="Comportement" value={p.comportement} onChange={(v) => patch("examen_psychiatrique", "comportement", v)} readOnly={readOnly} />
          <Field label="Humeur" value={p.humeur} onChange={(v) => patch("examen_psychiatrique", "humeur", v)} readOnly={readOnly} />
          <Field label="Affect" value={p.affect} onChange={(v) => patch("examen_psychiatrique", "affect", v)} readOnly={readOnly} />
          <Field label="Discours" value={p.discours} onChange={(v) => patch("examen_psychiatrique", "discours", v)} readOnly={readOnly} />
          <Field label="Pensée" value={p.pensee} onChange={(v) => patch("examen_psychiatrique", "pensee", v)} readOnly={readOnly} />
          <Field label="Perceptions" value={p.perceptions} onChange={(v) => patch("examen_psychiatrique", "perceptions", v)} readOnly={readOnly} />
          <Field label="Cognition" value={p.cognition} onChange={(v) => patch("examen_psychiatrique", "cognition", v)} readOnly={readOnly} />
          <Field label="Jugement / insight" value={p.jugement_insight} onChange={(v) => patch("examen_psychiatrique", "jugement_insight", v)} readOnly={readOnly} />
          <Field label="Risque suicidaire" value={p.risque_suicidaire} onChange={(v) => patch("examen_psychiatrique", "risque_suicidaire", v)} readOnly={readOnly} />
        </div>
      </Section>

      <Section title="VII. Examen traumatologique / orthopédique">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Inspection" value={t.inspection} onChange={(v) => patch("examen_traumatologique", "inspection", v)} readOnly={readOnly} />
          <Field label="Déformation" value={t.deformation} onChange={(v) => patch("examen_traumatologique", "deformation", v)} readOnly={readOnly} />
          <Field label="Tuméfaction" value={t.tumefaction} onChange={(v) => patch("examen_traumatologique", "tumefaction", v)} readOnly={readOnly} />
          <Field label="EVA (0–10)" value={t.eva} onChange={(v) => patch("examen_traumatologique", "eva", v)} readOnly={readOnly} />
          <Field label="Amplitudes articulaires" value={t.amplitudes_articulaires} onChange={(v) => patch("examen_traumatologique", "amplitudes_articulaires", v)} readOnly={readOnly} />
          <Field label="Stabilité" value={t.stabilite} onChange={(v) => patch("examen_traumatologique", "stabilite", v)} readOnly={readOnly} />
          <Field label="Marche / appui" value={t.marche_appui} onChange={(v) => patch("examen_traumatologique", "marche_appui", v)} readOnly={readOnly} />
          <Field label="Bilan fonctionnel" value={t.bilan_fonctionnel} onChange={(v) => patch("examen_traumatologique", "bilan_fonctionnel", v)} readOnly={readOnly} />
        </div>
      </Section>

      <Section title="Conclusion médicale">
        <Field label="Diagnostic" value={diagnostic} onChange={onDiagnosticChange} readOnly={readOnly} rows={2} />
        <Field label="Traitement / Ordonnance" value={traitement} onChange={onTraitementChange} readOnly={readOnly} rows={4} />
        <Field
          label="Prescription Hors Pharmacie"
          value={clinical.hors_pharmacie}
          onChange={(v) => onChange({ ...clinical, hors_pharmacie: v })}
          readOnly={readOnly}
          rows={4}
          placeholder="Médicaments à acheter à l'extérieur de l'hôpital..."
        />
      </Section>
    </div>
  );
}
