
FROM node:4-onbuild
RUN mkdir /root/logs
RUN touch /root/logs/app.log
ADD . /viz
WORKDIR /viz
RUN npm install
EXPOSE 4000
CMD ["node", "app.js"]
