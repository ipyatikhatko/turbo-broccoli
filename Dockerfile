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
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src/docs ./src/docs
EXPOSE 3000
CMD ["node", "dist/index.js"]
