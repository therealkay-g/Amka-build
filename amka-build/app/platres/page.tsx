"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { PLATRES_CONFIG } from "@/lib/modules/configs";
export default function PlatresPage() {
  return <ServiceModulePage config={PLATRES_CONFIG} />;
}
