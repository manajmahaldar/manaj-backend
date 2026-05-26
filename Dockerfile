FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using --production to skip devDependencies (like nodemon, pm2, concurrently)
RUN npm install --production

# Copy source code
COPY . .

# Expose ports (5000 is default)
EXPOSE 5000

# Start server
CMD ["node", "src/server.js"]
