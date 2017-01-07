
FROM node:4-onbuild
ADD . /viz
WORKDIR /viz
RUN npm install
EXPOSE 3000
CMD ["node", "app.js"]
