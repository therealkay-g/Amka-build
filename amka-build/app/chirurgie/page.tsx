"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { CHIRURGIE_CONFIG } from "@/lib/modules/configs";
export default function ChirurgiePage() {
  return <ServiceModulePage config={CHIRURGIE_CONFIG} />;
}
