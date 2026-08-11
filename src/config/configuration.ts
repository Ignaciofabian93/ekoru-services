export default () => ({
  port: parseInt(process.env.PORT || '4004', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  /** Sibling subgraphs this service calls directly (not via the gateway). */
  subgraphs: {
    /** users owns notification delivery — see common/clients/users.client.ts. */
    users: process.env.USERS_URL,
  },
  /**
   * Shared with the users subgraph. Must match INTERNAL_SERVICE_SECRET there
   * byte-for-byte or the internal notification mutation rejects the call.
   */
  internalSecret: process.env.INTERNAL_SERVICE_SECRET,
  /**
   * Public web app URL, used to deep-link notifications. Optional: without it
   * the notification falls back to a generic in-app destination.
   */
  webAppBaseUrl: process.env.WEB_APP_BASE_URL,
});
