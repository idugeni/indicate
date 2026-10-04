import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  // Upgrade to a paid plan to enable AI Gateway for your project.
  // aiGateway: true,
  buckets: {
    uploads: { access: "private" },
  },
  branch: (branch) => {
    if (branch.exists || branch.isDefault) {
      return {};
    }
    return {
      ttl: "7d",
      postgres: {
        computeSettings: {
          autoscalingLimitMinCu: 0.25,
          autoscalingLimitMaxCu: 1,
          suspendTimeout: "5m",
        },
      },
    };
  },
});
