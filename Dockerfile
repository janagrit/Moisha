# Single container for Cloud Run: builds the React frontend, then serves it
# together with the Vertex AI proxy from the Node backend.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci
COPY frontend frontend
RUN npm run build --prefix frontend

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production \
    API_BACKEND_HOST=0.0.0.0 \
    STATIC_DIR=/app/frontend/dist
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false
COPY backend/server.js backend/
COPY --from=build /app/frontend/dist frontend/dist
EXPOSE 8080
CMD ["node", "backend/server.js"]
