"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { LABORATORY_CONFIG } from "@/lib/modules/configs";
export default function LaboratoirePage() {
  return <ServiceModulePage config={LABORATORY_CONFIG} />;
}
