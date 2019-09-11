# FROM node:10.15.0-alpine
# # Create a work direcotry
# RUN mkdir -p /openlawnz/app

# WORKDIR /openlawnz/app

# COPY package*.json /openlawnz/app/

# #Production build use RUN npm ci --only=production
# RUN npm install

# COPY . /openlawnz/app

# RUN npm run dev

# EXPOSE 4000

# CMD ["node", "index.js"]