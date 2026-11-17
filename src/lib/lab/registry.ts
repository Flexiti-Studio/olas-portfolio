import React from "react";
import dynamic from "next/dynamic";

export interface ComponentMetadata {
  key: string;
  name: string;
  description: string;
  category: string;
}

export const COMPONENT_REGISTRY: Record<
  string,
  {
    meta: ComponentMetadata;
    component: React.ComponentType<any>;
  }
> = {
  InteractiveButtonDemo: {
    meta: {
      key: "InteractiveButtonDemo",
      name: "Interactive Button Matrix",
      description: "Interactive button variant showcase with micro-interactions and tactile feedback.",
      category: "UI Components",
    },
    component: dynamic(
      () => import("@/components/lab/demos/InteractiveButtonDemo"),
      { ssr: false }
    ),
  },
  DebouncedSearchDemo: {
    meta: {
      key: "DebouncedSearchDemo",
      name: "Debounced Auto-Suggest Search",
      description: "High-performance debounced input with mock network throttling and cancellation.",
      category: "Performance",
    },
    component: dynamic(
      () => import("@/components/lab/demos/DebouncedSearchDemo"),
      { ssr: false }
    ),
  },
};

export function getRegistryKeys(): string[] {
  return Object.keys(COMPONENT_REGISTRY);
}

export function getRegistryMetaList(): ComponentMetadata[] {
  return Object.values(COMPONENT_REGISTRY).map((item) => item.meta);
}
