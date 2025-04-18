# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application source code
COPY . .

# Expose port 3000
EXPOSE 3000

# Command to run the customer-service
CMD ["node", "index.js"]
