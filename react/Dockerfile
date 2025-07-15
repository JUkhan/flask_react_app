# Stage 1: Build the React application
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./

# Use pnpm for installation, as pnpm-lock.yaml is present
RUN npm install -g pnpm
RUN pnpm install

COPY . .
RUN pnpm run build

# Stage 2: Serve the application from a lightweight web server
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
