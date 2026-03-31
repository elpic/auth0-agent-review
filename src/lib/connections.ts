export const VALID_SERVICES = ["github", "slack"] as const;
export type Service = (typeof VALID_SERVICES)[number];

/** Maps our service names to Auth0 connection identifiers. */
export const CONNECTION_MAP: Record<Service, string> = {
  github: "github",
  slack: "sign-in-with-slack",
};
