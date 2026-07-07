# ---------- Stage 1: build do frontend React (Vite) ----------
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend FastAPI + frontend estático ----------
FROM python:3.11-slim

# Hugging Face Spaces roda o container com o usuário de UID 1000
RUN useradd -m -u 1000 user

WORKDIR /home/user/app

COPY --chown=user backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=user backend/ .
# Não copiar um infradoc.db antigo — o init_db() cria o banco do zero no container
RUN rm -f infradoc.db

# Frontend buildado (dist/) entra como pasta "static" servida pelo FastAPI
COPY --chown=user --from=frontend-build /app/frontend/dist ./static

# Garante que TODA a pasta (não só os arquivos copiados) pertence ao usuário "user",
# senão o SQLite não consegue criar o infradoc.db em runtime (permissão de escrita no diretório)
RUN chown -R user:user /home/user/app

USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
