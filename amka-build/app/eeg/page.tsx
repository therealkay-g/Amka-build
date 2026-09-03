"use client";
import { ServiceModulePage } from "@/components/modules/ServiceModulePage";
import { EG_CONFIG } from "@/lib/modules/configs";
export default function EegPage() {
  return <ServiceModulePage config={EG_CONFIG} />;
}
