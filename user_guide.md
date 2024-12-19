# Barilla Retail Media Assistant - Complete Guide

## Project Overview

The Barilla Retail Media Assistant is a cloud-based AI chat application that uses OpenAI's Assistants API. It consists of:

- Backend: Python/Flask API
- Frontend: React/Next.js application
- Deployment: Google Cloud Run

## Data Flow Architecture

```
Frontend                    Backend                         OpenAI API
   |                          |                                |
   |--- POST /chat ---------->|                                |
   |                          |--- Create/Get Thread --------->|
   |                          |<-- Thread ID ----------------- |
   |                          |                                |
   |                          |--- Send Message -------------->|
   |                          |<-- Message Confirmed --------- |
   |                          |                                |
   |                          |--- Start Stream -------------->|
   |<-- SSE Stream ---------- |<-- Token Stream ------------- |
   |                          |                                |
   |  (Continues until        |                                |
   |   stream complete)       |                                |
```

## Prerequisites

- Google Cloud account and project
- OpenAI API key
- OpenAI Assistant ID
- Docker installed locally
- Google Cloud CLI installed

## Environment Setup

### Environment Structure

```
.env (Backend)                     frontend/.env.local
├── OPENAI_API_KEY                 ├── NEXT_PUBLIC_API_URL
├── OPENAI_ASSISTANT_ID            └── (frontend config)
└── OPENAI_PROJECT_ID

requirements.txt                   package.json
└── openai>=1.12.0,<2.0.0         └── (frontend deps)
```

### Backend Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_ASSISTANT_ID=your_assistant_id
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=https://barilla-backend-tp3puay2aq-uc.a.run.app
```

## Local Development

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Deployment Process

### Deployment Architecture

```
Local                     Container                  Cloud Run
   |                          |                         |
   |-- Build Backend -------->|                         |
   |-- Push Image ----------->|-- Deploy ------------->GCP
   |                          |                         |
   |-- Build Frontend ------->|                         |
   |-- Push Frontend -------->|-- Deploy ------------->GCP
```

### 1. Backend Deployment

```bash
# Build container
docker build --platform=linux/amd64 -t gcr.io/barillarma/barilla-backend .

# Push to registry
docker push gcr.io/barillarma/barilla-backend

# Deploy to Cloud Run
gcloud run deploy barilla-backend \
  --image gcr.io/barillarma/barilla-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --set-env-vars "OPENAI_API_KEY=${OPENAI_API_KEY},OPENAI_ASSISTANT_ID=${OPENAI_ASSISTANT_ID}"
```

### 2. Frontend Deployment

```bash
cd frontend

# Build container
docker build --platform=linux/amd64 -t gcr.io/barillarma/barilla-frontend .

# Push to registry
docker push gcr.io/barillarma/barilla-frontend

# Deploy to Cloud Run
gcloud run deploy barilla-frontend \
  --image gcr.io/barillarma/barilla-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Key Files

### Backend

- `main.py`: Main Flask application
- `requirements.txt`: Python dependencies
- `Dockerfile`: Backend container configuration

### Frontend

- `frontend/src/`: React components
- `frontend/next.config.js`: Next.js configuration
- `frontend/Dockerfile`: Frontend container configuration

## OpenAI Configuration

The application uses OpenAI's Assistants API v2 with specific initialization:

```python
from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
client._custom_headers = {"OpenAI-Beta": "assistants=v2"}
```

## Monitoring and Maintenance

### Real-time Monitoring

```bash
# Watch logs in real-time
gcloud run services logs read barilla-backend \
  --region us-central1 \
  --limit 50

# Follow logs (continuous)
gcloud run services logs read barilla-backend \
  --region us-central1 \
  --follow
```

### Test Endpoints

```bash
# Test backend
curl https://barilla-backend-tp3puay2aq-uc.a.run.app/test

# Test chat endpoint
curl -X POST \
  https://barilla-backend-tp3puay2aq-uc.a.run.app/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## Troubleshooting

### Common Issues

1. OpenAI API Issues:

   - Check environment variables
   - Verify Assistant ID exists
   - Check API key permissions

2. Deployment Issues:

   - Clear Docker cache if build fails
   - Check Cloud Run service account permissions
   - Verify environment variables in Cloud Run

3. CORS Issues:
   - Check allowed origins in backend
   - Verify frontend URL configuration

### Quick Fixes

```bash
# Reset backend deployment
gcloud run services delete barilla-backend --region us-central1
# Then redeploy

# Clear Docker cache
docker system prune -af --volumes

# Check service status
gcloud run services describe barilla-backend --region us-central1
```

## Security Considerations

- API keys stored in Cloud Run environment
- CORS configured for specific origins
- Session management implemented
- No sensitive data in logs

## Version Information

- OpenAI SDK: >=1.12.0,<2.0.0
- Python: 3.12
- Node.js: Latest LTS
