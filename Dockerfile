FROM node:18

# Créer le dossier de travail
WORKDIR /app

# Installer netcat pour le script de démarrage
RUN apt-get update && apt-get install -y netcat-openbsd

# Copier les fichiers package.json
COPY package*.json ./

# Installer les dépendances (avec legacy peer deps)
RUN npm install --legacy-peer-deps

# Copier le reste de l'application
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Copier et rendre exécutable le script d'entrée
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Exposer le port utilisé par l'API
EXPOSE 3001

# Point d'entrée du conteneur
CMD ["/app/entrypoint.sh"]
