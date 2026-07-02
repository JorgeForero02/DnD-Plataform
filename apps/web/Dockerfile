FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @dnd/web build

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Rendered at container start by nginx envsubst entrypoint, substituting ${API_URL}.
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
