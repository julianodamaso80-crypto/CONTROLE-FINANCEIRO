FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

ARG GIT_SHA=dev
RUN echo "Building $GIT_SHA"

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# tzdata pra suportar TZ=America/Sao_Paulo. Sem isso, setar TZ não tem
# efeito no Alpine (que vem sem databases de timezone).
RUN apk add --no-cache openssl tzdata

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Sao_Paulo
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
