import { initBotId } from 'botid/client/core';

// Protect only the public tenant newsletter mutation.
// Keep machine-to-machine, webhook, health/status, MCP, and auth/Turnstile routes
// outside browser BotID so trusted integrations and existing auth flows keep working.
initBotId({
  protect: [
    {
      path: '/api/network/newsletter',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
  ],
});
