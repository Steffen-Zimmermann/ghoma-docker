FROM debian:10.7-slim
RUN apt update && apt upgrade -y 
RUN apt install -y npm
RUN mkdir app
WORKDIR /app
RUN npm install express mqtt ghoma
EXPOSE 3000
EXPOSE 4196
ENV MQTT_SERVER=
ENV MQTT_CLIENTID="ghoma-control-server"
ENV MQTT_USERNAME=
ENV MQTT_PASSWORD=
ENV MQTT_TOPIC="/ghoma"
COPY ghoma/express_mqtt.js /app/node_modules/ghoma
CMD cd /app/node_modules/ghoma && node express_mqtt.js