# Dockerfile for SpecRipper

# --- Stage 1: Build the Application ---
# This stage installs dependencies and builds the Next.js application.
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install dependencies using npm. Using --frozen-lockfile is a best practice for CI/CD
# to ensure you get the exact dependencies from your lock file.
RUN npm install --frozen-lockfile

# Copy the rest of the application source code into the container
COPY . .

# Ensure the 'public' directory exists to prevent copy errors if it's empty.
# This was the fix for the previous build error.
RUN mkdir -p /app/public

# Build the Next.js application for production
RUN npm run build


# --- Stage 2: Create the Final Production Image ---
# This stage creates a smaller, optimized image for running the application.
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user and group for better security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create the public directory in the final image
RUN mkdir -p public

# Copy only the necessary build artifacts from the 'builder' stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Change the ownership of the files to the non-root user
RUN chown -R nextjs:nodejs .

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 9002

# The command to start the application
CMD ["npm", "start"]
