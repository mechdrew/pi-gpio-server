(function () {
  var _ = require("lodash"),
	fs = require("fs"),
    express = require("express"),
    http = require("http"),
    app = express(),
    server = http.createServer(app),
    configPath = "./config.txt",
    gpio = require("pi-gpio"),
    io = require("socket.io")(server),
    path = require("path"),
    gpioPins = [
    /*2,*/ /*4,*/ /*6,*/   8,    10,    12,  /*14,*/  16,    18,  /*20*/,  22,    24,    26,  /*28,*//*30,*/  32,  /*34,*/  36,    38,    40,
    /*1,*/   3,     5,     7,   /*9,*/  11,    13,    15,  /*17,*/  19,    21,    23,  /*25,*//*27,*/  29,    31,    33,    35,    37,  /*39*/
    ],
    defaults = [
      { pin: 12, active: false, name: "1st" },
      { pin: 16, active: false, name: "2nd" }
    ],
    pins = [
      // { pin: number, active: true|false, name: "string" }
    ],
    port = parseInt(process.argv[2], 10) || 80,
    q = require("q");

  function startServer() {
    require("domain").create().on("error", function (err) {
      console.log("Error running Pi GPIO Server: " + err);
    }).run(function () {
      server.listen(port, function () {
        console.log("Pi GPIO Server started. Listening on port %d.", port);
      });
    });
  }
  
  function loadDefaults() {
    pins = defaults;
    _.each(pins, function (pin) {
      initializePin(pin);
    });
  }

  function readConfig() {
    var deferred = q.defer();
    fs.unwatchFile(configPath);
    fs.readFile(configPath, "utf8", function (err, data) {
      if (err) {
        console.log("No config file found, resolving to defaults.");
        loadDefaults();
      } else {
        if (data.length > 0) {
          data = JSON.parse(data);
          if (_.isEmpty(data)) {
            loadDefaults();
          } else {
            // Remove pins that aren't in the config file.
            _.each(_.difference(_.pluck(pins, "pin"), _.pluck(data, "pin")), function (pin) {
              gpio.close(pin);
            });
            // Add or update the pins in the config file.
            _.each(data, function (newPin) {
              var pin = _.findWhere(pins, { pin: newPin.pin });
              if (pin) {
                if (pin.active !== newPin.active) {
                  togglePin(newPin);
                }
              } else {
                initializePin(newPin);
              }
            });
            pins = data;
          }
        }
      }
      io.emit("pins", pins);
      fs.watchFile(configPath, readConfig);
      deferred.resolve();
    });

    return deferred.promise;
  }

  function initializePin(pin) {
    if (pin && _.contains(gpioPins, pin.pin)) {
      gpio.open(pin.pin, "output")
        .then(
          function () {
            gpio.write(pin.pin, pin.active ? 1 : 0)
          },
          function () {
            gpio.close(pin.pin)
              .then(gpio.open(pin.pin, "output"), console)
              .then(gpio.write(pin.pin, pin.active ? 1 : 0), console);
          });
    }
  }

  function togglePin(data) {
    var pin = _.findWhere(pins, {pin: parseInt(data.pin, 10) });
    if (pin) {
      pin.active = _.isBoolean(data.active) ? data.active : !pin.active;
      gpio.write(pin.pin, (pin.active ? 1 : 0))
        .then(function () {
          io.emit("pin", pin);
          console.log("toggled pin " + pin.pin);
          fs.unwatchFile(configPath);
          fs.writeFile(configPath, JSON.stringify(pins), "utf8", function (error) {
            if (error) {
              console.log(error);
            }
            fs.watchFile(configPath, readConfig);
          });
        }, console);
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
      socket.emit("pin", _.findWhere(pins, { pin: pin }) || { error: "Not a valid pin.", pin: pin });
    });
    socket.emit("pins", pins);
  });

  app.use(express.static(path.join(__dirname, "public")));
  app.get("/", function (req, res) {
    res.sendFile(__dirname + "/public/power/index.html");
  });

  // Load pins from config file and then start the server.
  readConfig()
    .then(startServer);
}());

