(function () {
  var _ = require("lodash"),
    express = require("express"),
    http = require("http"),
    app = express(),
    server = http.createServer(app),
    gpio = require("gpio"),
    io = require("socket.io")(server),
    path = require("path"),
    pins = {
      1: false,
      2: false,
      7: true,
      9: false
    },
    port = parseInt(process.argv[2], 10) || 80,
    q = require("q");

  app.use(express.static(path.join(__dirname, "public")));
  app.get("/", function (req, res) {
    res.sendFile(__dirname + "/public/power/index.html");
  });

  function togglePin(data) {
    data.pin = parseInt(data.pin, 10);
    if (_.has(pins, data.pin)) {
      data.active = _.isBoolean(data.active) ? data.active : !pins[data.pin];
      pins[data.pin] = data.active;
      gpio.open(data.pin, "output")
        .then(gpio.write(data.pin, (data.active ? 1 : 0)))
        .then(function () {
          io.emit("pin", data);
          console.log("toggled pin " + data.pin);
        });
    }
  }

  io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });

    socket.on("togglePin", togglePin);
    socket.on("requestPins", function () {
      console.log("pins requested");
      socket.emit("pins", pins);
    });
    socket.on("requestPin", function (pin) {
      console.log("pin requested");
      socket.emit("pin", { pin: pin, active: pins[pin] });
    });
  });

  var pinPromises = [];
  _.each(pins, function (active, pin) {
    pinPromises.push(gpio.open(pin, "input")
    .then(gpio.read(pin), console)
    .then(function (value) {
      pins[pin] = value;
    }, console));
  });
  
  q.allSettled(pinPromises).then(startServer);
  //startServer();

  function startServer() {
    require("domain").create().on("error", function (err) {
      console.log("Error running Pin Server: " + err);
    }).run(function () {
      server.listen(port, function () {
        console.log("Pin Server started. Listening on port %d.", port);
      });
    });
  }
}());

