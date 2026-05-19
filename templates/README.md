# ErrorLens — Platform Connection Templates

This folder contains ready-to-use templates for connecting platforms to the ErrorLens webhook.

| File | Purpose | How to use |
|---|---|---|
| `n8n-error-handler.json` | n8n workflow JSON | Import into n8n via Workflows → Import from File. Then set it as the global error workflow on every workflow (Workflow settings → Error Workflow). |
| `make-error-handler.md` | Make.com setup guide | Step-by-step instructions for adding the error route to each scenario |

## After importing the n8n template

1. **Set Slack credentials** — open the Slack node, click the credential dropdown, pick or create your Slack credential. (The HTTP node to ErrorLens needs no credentials — it uses the `x-api-key` header.)

2. **Make this the global error workflow** — for every n8n workflow you want monitored:
   - Open the workflow → click the `...` menu (top right) → **Settings**
   - Under **Error Workflow**, select "ErrorLens — Central Error Handler"
   - Save the workflow

3. **Verify with a deliberate test** — pick any test workflow, add a "Stop and Error" node, execute it. Within 10s you should see the error in ErrorLens.

## Environment variables required on Vercel

| Variable | Purpose |
|---|---|
| `ERRORLENS_WEBHOOK_SECRET` | API key for `x-api-key` header (default: `el_webhook_2025`) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL for fallback alerts. Optional — if unset, Slack fan-out is silently skipped. |

To add the Slack webhook URL:

```bash
vercel env add SLACK_WEBHOOK_URL production
# paste your https://hooks.slack.com/services/... URL
vercel deploy --prod
```
