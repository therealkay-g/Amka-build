"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { HOSPITALISATION_CONFIG } from "@/lib/modules/configs";
export default function HospitalisationPage() {
  return <ServiceModulePage config={HOSPITALISATION_CONFIG} />;
}
