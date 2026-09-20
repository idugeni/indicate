# Telegram Notifications — Decision Log

Status: partially implemented (2026-09-19, owner-approved): event composers
(`telegram-notifications.ts`: article created, job published/failed) and
group fan-out (`TelegramNotificationService` + worker/article hooks, outbox +
drain) are live. Per-event preferences and multi-group subscriptions remain
planned; chat commands stay retired.

## 2026-09-19 — group-only notifications, chat commands retired

- Bot chat keeps two commands only: `/start` (Mini App entry link; in a
  group, admin-issued `/start` binds the group as the org channel) and
  `/stop` (unbind / opt out).
- All other chat commands (`/article`, `/publish`, `/status`, …) are
  withdrawn from the Bot API menu and answered with a Mini App redirect.
  All actions move to the Mini App (`/tg/app`); shared services, guards,
  and idempotency stay unchanged.
- Notifications are one-way, to groups only. Initial events: site
  published, job failed (with a Mini App deep link for retry), article
  created. Delivery reuses the existing outbox + drain pattern.
- One org starts with exactly one group (extendable to many later with a
  subscription table + per-event preferences). Only an org admin may
  bind/unbind; the bot must be group admin to post.

## Platform infrastructure channel

First notification target (supergroup):

- id: `-1004266191453`
- title: `Indicate - Publishing Infrastructure`
- type: `supergroup`

This is the platform-level channel (infra alerts for the platform team),
separate from per-org tenant groups which are bound dynamically via
in-group `/start`. When implemented, prefer deployment-level configuration
(env / runtime config) over a hardcoded constant for this id.
