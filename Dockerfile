FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS email-build
COPY maizzle.config.cjs ./maizzle.config.cjs
COPY src/mail ./src/mail
COPY tailwind.config.cjs ./tailwind.config.cjs
RUN pnpm email:build

FROM deps AS build
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.ts ./
RUN pnpm build

FROM base AS runner
# Runtime env (Compose, Cloud Run, etc.): DATABASE_URL, BASE_URL, WEB_URL, GITHUB_TOKEN,
# RESEND_API_KEY, RESEND_FROM, SCANNER_SECRET_KEY, SCANNER_CRON_*, PORT — see .env.example.
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src/docs ./src/docs
COPY --from=email-build /app/src/mail/compiled ./src/mail/compiled
EXPOSE 3000
CMD ["node", "dist/index.js"]
