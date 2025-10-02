export interface ServiceDefinition {
  id: string;
  label: string;
  legacyIds?: string[];
}

const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  {
    id: "yard-care",
    label: "Yard & Outdoor Care",
    legacyIds: ["property-cleanup"],
  },
  {
    id: "home-fixes",
    label: "Home Fixes & Odd Jobs",
    legacyIds: ["handyman-jobs"],
  },
  {
    id: "grocery-runs",
    label: "Grocery Runs",
  },
];

const labelById: Record<string, string> = SERVICE_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.id] = definition.label;
    definition.legacyIds?.forEach((legacyId) => {
      acc[legacyId] = definition.label;
    });
    return acc;
  },
  {} as Record<string, string>
);

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const getServiceLabel = (serviceId: string | null | undefined): string => {
  if (!serviceId) {
    return "Local Service";
  }

  return labelById[serviceId] ?? toTitleCase(serviceId);
};

export const getServiceLabels = (serviceIds: string[] | null | undefined): string[] => {
  if (!serviceIds || serviceIds.length === 0) {
    return [];
  }
  return serviceIds.map((serviceId) => getServiceLabel(serviceId));
};

export const listServiceOptions = (): ServiceDefinition[] => SERVICE_DEFINITIONS;
