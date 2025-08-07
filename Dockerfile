# Dockerfile

# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
# Using --frozen-lockfile is a best practice for CI/CD environments
RUN npm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Create the public directory if it doesn't exist to prevent copy errors
RUN mkdir -p /app/public

# Build the Next.js application
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
# This is a legacy format, but it's what the base image expects for now.
# We will suppress the warning in the build process if possible, but it is not harmful.
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The public folder might not exist if there are no static assets.
# Create it to ensure the COPY command doesn't fail.
RUN mkdir -p public

# Copy the built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Change ownership of the files to the non-root user
RUN chown -R nextjs:nodejs .

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 9002

# The command to start the application
CMD ["npm", "start", "--", "-p", "9002"]
