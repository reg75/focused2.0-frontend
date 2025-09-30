FROM nginx:alpine

# Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# App shell
COPY index.html /usr/share/nginx/html/index.html

# Static assets go under /static
RUN mkdir -p /usr/share/nginx/html/static
COPY styles.css  /usr/share/nginx/html/static/styles.css
COPY scripts.js  /usr/share/nginx/html/static/scripts.js
