# Use Node.js 22 Alpine as base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies quietly
RUN npm install --silent -g pm2 && npm install --silent

# Copy the entire project to the working directory
COPY . .

# Run Prisma generate
RUN npx prisma generate

# Run Prisma migrate deploy
RUN npx prisma migrate deploy

# Expose the default port used in the project
EXPOSE 3000

# Use PM2 with auto-restart on crash
CMD ["pm2-runtime", "--name", "whatsapp-api", "--restart-delay", "1000", "server.js"]
