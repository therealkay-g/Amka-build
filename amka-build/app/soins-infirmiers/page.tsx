"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { SOINS_INFIRMIERS_CONFIG } from "@/lib/modules/configs";
export default function SoinsInfirmiersPage() {
  return <ServiceModulePage config={SOINS_INFIRMIERS_CONFIG} />;
}
