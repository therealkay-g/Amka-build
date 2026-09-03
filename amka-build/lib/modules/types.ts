import type { LucideIcon } from "lucide-react";
import type { ModuleKey, ServiceStatus } from "../types";

export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "date" | "datetime";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  showInTable?: boolean;
  tableWidth?: string;
};

export type ModuleConfig = {
  key: ModuleKey;
  table: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  modulePermission: ModuleKey;
  patientField?: string;
  dateField?: string;
  amountField?: string;
  statusField?: string;
  fields: FieldConfig[];
  defaultForm: Record<string, string>;
  paymentType: string;
  createLabel?: string;
  examCategory?: string;
  isWorkflowService?: boolean;
};


export const SERVICE_STATUSES: ServiceStatus[] = ["EN_ATTENTE", "EN_COURS", "TERMINE", "ANNULE"];
