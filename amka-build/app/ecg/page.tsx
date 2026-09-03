"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { ECG_CONFIG } from "@/lib/modules/configs";
export default function EcgPage() {
  return <ServiceModulePage config={ECG_CONFIG} />;
}
