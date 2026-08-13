# =============================================================================
# Multi-stage production image for Angular banking-system
# =============================================================================

# ---- Stage 1: build ----
FROM node:18-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG BASE_HREF=/
RUN npx ng build --configuration production --base-href=${BASE_HREF}

# ---- Stage 2: static nginx ----
FROM nginx:1.27-alpine AS runtime

# Remove default site; use SPA-aware config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/banking-system /usr/share/nginx/html
# Maintenance page (swapped in when MAINTENANCE_MODE=1)
COPY maintenance/index.html /usr/share/nginx/maintenance/index.html
COPY scripts/docker-entrypoint.sh /docker-entrypoint-banking.sh
RUN chmod +x /docker-entrypoint-banking.sh \
  && cp /usr/share/nginx/html/index.html /usr/share/nginx/html/index.html.app

EXPOSE 80

# Toggle at runtime without rebuild:
#   docker run -e MAINTENANCE_MODE=1 ...
ENV MAINTENANCE_MODE=0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

ENTRYPOINT ["/docker-entrypoint-banking.sh"]
