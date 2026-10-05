"use client";

import dynamic from "next/dynamic";

const PageAgentSuperpositionClient = dynamic(
  () => import("./PageAgentSuperpositionClient"),
  { ssr: false, loading: () => null }
);

export default function PageAgentSuperposition() {
  return <PageAgentSuperpositionClient />;
}
