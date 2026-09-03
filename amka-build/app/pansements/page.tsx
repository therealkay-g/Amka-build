"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { PANSEMENTS_CONFIG } from "@/lib/modules/configs";
export default function PansementsPage() {
  return <ServiceModulePage config={PANSEMENTS_CONFIG} />;
}
