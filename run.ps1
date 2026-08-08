Start-Process powershell -ArgumentList "ollama serve"

Start-Process powershell -ArgumentList "cd backend; pip install -r requirements.txt; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Process powershell -ArgumentList "cd frontend; npm install; npm start"