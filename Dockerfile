# Stage 1: Build the application
# Use the official Node.js 20 image as a base.
# Using 'alpine' for a smaller final image size.
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install dependencies. This is done in a separate layer to leverage Docker's caching.
# This step will create a Linux-compatible node_modules folder.
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Build the Next.js application for production
RUN npm run build


# Stage 2: Production image
# Use a smaller, more secure base image for the final container
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Set environment variable for Node.js to run in production mode
ENV NODE_ENV production

# Copy the built application from the 'builder' stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Expose the port the app runs on
EXPOSE 9002

# The command to start the app
CMD ["npm", "start", "--", "-p", "9002"]
