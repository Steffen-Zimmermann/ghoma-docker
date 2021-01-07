Docker file to run the ghoma npm daemon

Original work here :
https://github.com/rodney42/node-ghoma

How to set Wifi Smart Socket to own control server
https://community.openhab.org/t/solved-g-homa-wifi-smart-socket-emw302wf-and-emw302wfo-with-openhab2/21524/32

Supports MQTT protocol using ENV vars:
  MQTT_SERVER
  MQTT_CLIENTID
  MQTT_USERNAME
  MQTT_PASSWORD

Quickstart commands:

docker build -t ghoma-docker https://github.com/Steffen-Zimmermann/ghoma-docker.git

docker run -d -p 3000:3000 -p 4196:4196 -e MQTT_SERVER=mqtt.eclipse.org --name ghoma-docker ghoma-docker

get interativ console to set Wifi Smart Socket to own control server

docker exec -it ghoma-docker bash 


Example for OpenHab Item:

Switch Ghoma1 "Ghoma Switch" ["Lighting"] {channel="mqtt:topic:bc325ff7:Switch_Steckdose_Balkon"}
(Create MQTT Brocker and Generic MQTT Thing over UI)

or

Switch GHoma1 "G-Homa1" {mqtt=">[mosquitto:/ghoma/switch/621394:command:ON:ON],>[mosquitto:/ghoma/switch/621394:command:OFF:OFF],<[mosquitto:/ghoma/state/621394:state:default]"}
(Create MQTT Brocker on Things File)


