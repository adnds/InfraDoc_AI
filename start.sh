#!/bin/bash
# InfraDoc AI — Script de inicialização
echo " Iniciando InfraDoc AI..."

# Backend
echo "▶ Iniciando backend FastAPI (porta 8000)..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

sleep 2

# Frontend
echo "▶ Iniciando frontend React (porta 5173)..."
cd frontend
npm install -q
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ InfraDoc AI rodando!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Para expor publicamente:"
echo "   ngrok http 5173"
echo ""
echo "Pressione Ctrl+C para parar."

wait
