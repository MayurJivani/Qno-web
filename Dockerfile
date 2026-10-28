# Built by GitHub Actions (.github/workflows/image.yml), pulled by Coolify on Jinx.
FROM node:22-slim AS build
WORKDIR /app
COPY . .
# Baked into the client at build time.
ARG VITE_WS_URL=wss://qno.futile.studio
RUN npm run build && npm --prefix backend prune --omit=dev

FROM node:22-slim
WORKDIR /app/backend
COPY --from=build /app/backend /app/backend
COPY --from=build /app/frontend/dist /app/frontend/dist
ENV NODE_ENV=production PORT=3002
USER node
CMD ["node", "dist/app.js"]
