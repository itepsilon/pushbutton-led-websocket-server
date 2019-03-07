var http = require("http");
var WebSocketServer = require("websocket").server;

var fs = require("fs");
var Gpio = require("onoff").Gpio;
var LED = new Gpio(4, "out");
var pushButton = new Gpio(17, "in", "both");

var httpServer = http.createServer(function(req, res) {
  fs.readFile(__dirname + "/index.html", function(err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html" });
      return res.end("404 Not Found");
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.write(data);
    return res.end();
  });
});

httpServer.listen(8080);

wss = new WebSocketServer({
  httpServer: httpServer,
  autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // Put logic here to detect whether the specified origin (i.e., client) is allowed.
  return true;
}

wss.on("request", function(request) {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    console.log(
      new Date() + " Connection from origin " + request.origin + " rejected."
    );
    return;
  }
  console.log(new Date() + " Try to connect.");
  var connection = request.accept("echo-protocol", request.origin);
  console.log(new Date() + " Connection accepted.");
  pushButton.watch(function(err, value) {
    if (err) {
      console.error("There was an error", err);
      return;
    }
    var lightvalue = value;
    if (lightvalue != LED.readSync()) {
      LED.writeSync(lightvalue);
    }
    connection.send(lightvalue);
  });
  connection.on("message", function(message) {
    var lightvalue = Number(message.utf8Data);
    if (lightvalue != LED.readSync()) {
      LED.writeSync(lightvalue);
    }
    connection.send(lightvalue);
  });
  connection.on("close", function(reasonCode, description) {
    console.log(
      new Date() + " Peer " + connection.remoteAddress + " disconnected."
    );
  });
});
process.on("SIGINT", function() {
  LED.writeSync(0);
  LED.unexport();
  pushButton.unexport();
  process.exit();
});
