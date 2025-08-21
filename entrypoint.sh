#!/bin/sh

echo "⏳ Attente de PostgreSQL..."
until nc -zv "$DATABASE_HOST" "$DATABASE_PORT" > /dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL est prêt"

echo "⚙️ Lancement de 'prisma db push'..."
npx prisma db push

echo "🚀 Lancement de l’application NestJS"
npm run start:dev
