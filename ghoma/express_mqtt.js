/**
 * Usage example for the ghoma control server library together with a minimal express.js application.
 *
 * You have to run 'npm install express' before starting this example by 'node express_example.js'.
 * A ghoma control server is started on port 4196 and a http server is started on port 3000.
 *
 * Now you can open your browser with these urls:
 *
 * http://localhost:3000/list       Displays a list of all registered ghoma wifi plugs.
 * http://localhost:3000/allon      Switch all plugs on.
 * http://localhost:3000/alloff     Switch all plugs off.
 * http://localhost:3000/on/ID      Switch a plug on. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/off/ID     Switch a plug off. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/info/ID    Current info of a plug. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/state/ID   Current state of a plug. Replace ID with the short mac, that can be retrieved by the 'list' call.
 */
var ghoma = require('./ghoma.js');
var express = require('express');
const mqtt = require('mqtt');
const mqttServer = process.env.MQTT_SERVER || null;							// MQTT_Server example: test.mosquitto.org
const mqttClientID = process.env.MQTT_CLIENTID || 'ghoma-control-server'; 	// MQTT ClientId 
const mqttUser = process.env.MQTT_USERNAME || '';   						// User for mqtt-server
const mqttPWD = process.env.MQTT_PASSWORD || '';   							// Password for mqtt-server
const mqttBaseTopic = process.env.MQTT_TOPIC || '/ghoma';   				// Default topic
const mqtt_Topic_Switch = "/switch/";										// Topic for switch plug
const mqtt_Topic_Info = "/info/";											// Topic for get last State of plug
const mqtt_Topic_State = "/state/";											// Topic for Response of Request Topic [Switch, Info]

var mqtt_connection_options={
	clientId:mqttClientID,
	username:mqttUser,
	password:mqttPWD,
	clean:true
};

var app = express();

// Uncomment this line to get a detailed log output
ghoma.log=console.log;

var httpPort = 3000;    // Express http listening port
var ghomaPort = 4196;   // G-Homa default port

var mqttclient;
var mqttconnected = false;


 
/**
 * List all registered plugs.
 */
app.get('/list', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var plugs = [];
  ghoma.forEach(function(plug) { plugs.push(plug); });
  res.send(JSON.stringify(plugs));
});

/**
 * Switch a plug on by id
 */
app.get('/on/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
	  handleEventSwitchOn(plug);
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
});

/**
 * Switch a plug off by id
 */
app.get('/off/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
      handleEventSwitchOff(plug);
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
});

/**
 * Retrieve the current info of a plug by id.
 */
app.get('/info/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(plug.state));
    } else {
      res.sendStatus(404);
    }
});

/**
 * Retrieve the current state of a plug by id.
 */
app.get('/state/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(plug.state);
    } else {
      res.sendStatus(404);
    }
});


/**
 * Switch all registered plugs on
 */
app.get('/allon', function (req, res) {
  ghoma.forEach(function(plug,idx) { handleEventSwitchOn(plug); });
  res.sendStatus(200);
});

/**
 * Switch all registered plugs off
 */
app.get('/alloff', function (req, res) {
  ghoma.forEach(function(plug,idx) { handleEventSwitchOff(plug); });
  res.sendStatus(200);
});

function handleEventSwitchOn (plug) {
	plug.on();
	if (mqttconnected) mqttclient.publish(mqttBaseTopic + mqtt_Topic_State + plug.id,'ON');
}

function handleEventSwitchOff (plug) {
	plug.off();
	if (mqttconnected) mqttclient.publish(mqttBaseTopic + mqtt_Topic_State + plug.id,'OFF');
}

// Register a listener for new plugs, this is only for a log output
ghoma.onNew = function(plug) {
  console.log('Registerd plug from ' + plug.remoteAddress+" with id "+plug.id);
}

// Start the ghoma control server listening server on this port
ghoma.startServer(ghomaPort);

// Start the express http server listening
app.listen(httpPort, function () {
  console.log('ghoma express example app start listening on port '+httpPort+' for http requests.');
  
  if (mqttServer !== undefined && mqttServer !== null) {
	
	mqttclient = mqtt.connect('mqtt://'+ mqttServer,mqtt_connection_options);
	
	/**
	* Event - MQTT Connect
	*/
	mqttclient.on('connect', () =>{
		console.log('connected to MQTT-Server: %s', mqttServer);
		mqttconnected = true;
		mqttclient.subscribe(mqttBaseTopic + mqtt_Topic_Switch + '#');
		console.log('subscribe Topic: %s', mqttBaseTopic + mqtt_Topic_Switch + '#');
		mqttclient.subscribe(mqttBaseTopic + mqtt_Topic_Info + '#');
		console.log('subscribe Topic: %s', mqttBaseTopic + mqtt_Topic_Info + '#');
	});

	/**
	* Event - MQTT Connection Error
	*/
	mqttclient.on("error",(error) =>{ 
		console.log("Can't connect to %s ", mqttServer);
		console.log("Error : %s", error);
		mqttclient = null;
	});

	/**
	* Event - MQTT Get Message form MQTT-Server
	*/
	mqttclient.on('message', (topic, message) => {
		console.log('received message %s - %s', topic, message);
		var lastPosSwitch = topic.lastIndexOf(mqtt_Topic_Switch) || -1;
		var lastPosInfo = topic.lastIndexOf(mqtt_Topic_Info) || -1;
		var lastPosSlash = topic.lastIndexOf("/");
		var plug_id = topic.toString().substr(lastPosSlash + 1);
		//console.log('last Position of / on message : %s', lastPosSlash);
		//console.log('plug-id : %s ', plug_id);
		var plug = ghoma.get(plug_id);
  
		if ( plug ) {
			if (lastPosSwitch > 0) {
				if (message !== undefined && message !== null && message.toString().toUpperCase() === 'ON') handleEventSwitchOn(plug);
				if (message !== undefined && message !== null && message.toString().toUpperCase() === 'OFF') handleEventSwitchOff(plug);
			}
			if (lastPosInfo > 0) {
				if (mqttconnected) mqttclient.publish(mqttBaseTopic + mqtt_Topic_State + plug.id, plug.state.toUpperCase());
			}
		}
	});
  }
});
