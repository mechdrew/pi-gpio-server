(function () {
  var socket = io();
  var app = angular.module("Pins", []);

  function pinCtrl(
    $scope
  ) {
    $scope.pins = {};
    function updatePin(active, pin) {
      if (_.isBoolean(active)) {
        $scope.pins[pin] = active;
      }
    }
    socket.on("pins", function (pins) {
      $scope.$apply(function () {
        _.each(pins, updatePin);
      });
    });
    socket.on("pin", function (pin) {
      $scope.$apply(function () {
        updatePin(pin.active, pin.pin);
      });
    });
    socket.emit("requestPins");
    $scope.togglePin = function (pin) {
      socket.emit("togglePin", { pin: pin });
    };
  }

  pinCtrl.$inject = [
    "$scope"
  ];

  app.controller("PinCtrl", pinCtrl);
}());
