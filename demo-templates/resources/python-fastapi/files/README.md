# {{PROJECT_NAME}}

{{API_TITLE}} - FastAPI microservice

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Development

```bash
uvicorn main:app --reload --port {{PORT}}
```

## API Docs

Visit `http://localhost:{{PORT}}/docs`