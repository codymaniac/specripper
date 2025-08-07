# Dockerfile

# The "Builder" stage installs dependencies and builds the application.
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application for production
RUN npm run build

# The "Runner" stage creates the final, lean image for running the application.
FROM node:20-alpine AS runner
WORKDIR /app

# Set the environment to production
ENV NODE_ENV production

# Create a non-root user for security purposes
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from the "builder" stage
# We create the public directory here to prevent errors if it doesn't exist.
RUN mkdir -p public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Change ownership of the files to the non-root user
USER nextjs
RUN chown -R nextjs:nodejs /app/.next
RUN chown -R nextjs:nodejs /app/public
RUN chown -R nextjs:nodejs /app/node_modules
RUN chown -R nextjs:nodejs /app/package.json


# Expose the port the app runs on (must match the PORT environment variable)
EXPOSE 9002

# The command to start the application
CMD ["npm", "start"]
