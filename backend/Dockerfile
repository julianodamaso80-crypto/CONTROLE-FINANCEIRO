FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# puppeteer-core não baixa Chromium, mas deixa explícito
ENV PUPPETEER_SKIP_DOWNLOAD=true

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

# tzdata: TZ=America/Sao_Paulo depende dos databases de timezone no Alpine.
# chromium + fontes: geração de PDF via puppeteer-core (relatórios mensais).
RUN apk add --no-cache \
      openssl \
      tzdata \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      font-noto \
      font-noto-emoji

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Sao_Paulo
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

