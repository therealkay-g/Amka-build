"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { RADIOLOGY_CONFIG } from "@/lib/modules/configs";
export default function RadiologiePage() {
  return <ServiceModulePage config={RADIOLOGY_CONFIG} />;
}
