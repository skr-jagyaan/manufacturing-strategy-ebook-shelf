# ── SHELF SERVICE — DEPLOY COMMAND ──────────────────────────────────────────
# Run from the shelf/ directory
# Replace BOOK1_URL and SHELF_URL with actual URLs once known

gcloud builds submit \
  --tag asia-south1-docker.pkg.dev/vcf-01/manufacturing-shelf/app:latest && \
gcloud run deploy manufacturing-shelf \
  --image asia-south1-docker.pkg.dev/vcf-01/manufacturing-shelf/app:latest \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "FIREBASE_PROJECT_ID=vcf-01,EMAIL_HOST=mail.sudharsankr.co.in,EMAIL_USER=info@sudharsankr.co.in,EMAIL_PORT=587,BOOK1_URL=https://manufacturing-series-65462349033.asia-south1.run.app,SHELF_URL=https://shelf.sudharsankr.co.in" \
  --set-secrets "EMAIL_PASS=EMAIL_PASS:latest,RZP_SECRET=RZP_SECRET:latest"

# ── AFTER DEPLOY ─────────────────────────────────────────────────────────────
# 1. Note the Cloud Run URL (e.g. https://manufacturing-shelf-XXXXXXXX.asia-south1.run.app)
# 2. Map shelf.sudharsankr.co.in to it in Cloud Run domain mappings
# 3. Update payment.html: BACKEND_URL → shelf Cloud Run URL
# 4. Update app.js in Book 1: SHELF_URL → actual shelf URL
# 5. Redeploy Book 1 with updated SHELF_URL

# ── ARTIFACT REGISTRY — first time only ──────────────────────────────────────
# gcloud artifacts repositories create manufacturing-shelf \
#   --repository-format=docker \
#   --location=asia-south1 \
#   --description="Shelf service"
