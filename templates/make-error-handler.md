# Make.com Error Handler Setup

Make.com doesn't have a central error trigger like n8n — error handling is configured **per-scenario** via Error Handler routes attached to modules.

## Two-step setup per scenario

### Step 1 — Add an Error Handler route to your scenario

1. In your Make.com scenario, right-click any module → **Add error handler**
2. From the error-handler chain, drop in an **HTTP "Make a request"** module
3. Configure it as below

### Step 2 — Configure the HTTP module

| Field | Value |
|---|---|
| URL | `https://errorlens-deploy.vercel.app/api/webhook` |
| Method | `POST` |
| Headers | `x-api-key: el_webhook_2025` and `x-platform: make` |
| Body type | Raw |
| Content type | JSON (application/json) |
| Request content | (see JSON below) |

### Request body JSON

Paste this exactly. Make.com auto-substitutes the `{{...}}` tokens with live scenario context.

```json
{
  "scenario": {
    "id": "{{scenario.id}}",
    "name": "{{scenario.name}}"
  },
  "execution": {
    "id": "{{execution.id}}",
    "startedAt": "{{execution.startedAt}}",
    "endedAt": "{{now}}"
  },
  "error": {
    "type": "{{error.type}}",
    "message": "{{error.message}}",
    "module": { "name": "{{error.moduleName}}" }
  },
  "severity": "error",
  "dlq": false
}
```

### Step 3 — Use the "Ignore" or "Commit" directive after the HTTP call

After the HTTP module, append either:
- **Ignore** — to let the scenario continue (recommended for non-blocking errors)
- **Commit** — to mark the bundle as committed before erroring out (preserves partial progress)
- **Break** — to send the bundle to the DLQ (Incomplete Executions) for manual replay

## Bulk strategy — apply to all your scenarios

There's no Make.com API to retroactively attach Error Handlers to existing scenarios. You have three options:

1. **Manual** — duplicate the handler from one scenario into others using the right-click → Clone module feature
2. **Template** — export a working scenario as a Blueprint (`...` menu → Export Blueprint), then import it into other scenarios and copy just the error-handler branch
3. **Webhook intercept** — for HTTP-triggered scenarios, point the upstream sender at a single ErrorLens-wrapped endpoint instead of Make.com directly

## Verify it's working

Trigger a deliberate error in any scenario (e.g., add a Get-record module with an invalid ID). Within 10 seconds you should see:

- New row in the Supabase `el_errors` table (filter by `platform_type = 'make'`)
- Slack message in your `#errors` channel (if `SLACK_WEBHOOK_URL` env var is set on Vercel)
- New entry on the ErrorLens dashboard at https://errorlens-deploy.vercel.app/
