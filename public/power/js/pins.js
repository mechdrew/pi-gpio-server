(function () {
  var socket = io();
  var app = angular.module("Pins", []);

  function pinCtrl(
    $scope
  ) {
    $scope.pins = [];
    $scope.connected = false;

    function updatePin(newPin) {
      if (newPin && _.isBoolean(newPin.active)) {
        var pin = _.findWhere($scope.pins, { pin: newPin.pin });
        if (pin && !_.isEqual(pin, newPin)) {
          if (_.isBoolean(newPin.active) && pin.active !== newPin.active) {
            pin.active = newPin.active;
          }
          if (_.isString(newPin.name) && pin.name !== newPin.name) {
            pin.name = newPin.name;
          }
        }
      }
    }
    function connectTrue() {
      $scope.$apply(function () {
        $scope.connected = true;
      });
    }
    function connectFalse() {
      $scope.$apply(function () {
        $scope.connected = false;
      });
    }

    socket.on("pins", function (pins) {
      $scope.$apply(function () {
        $scope.pins = pins;
      });
    });
    socket.on("pin", function (pin) {
      $scope.$apply(function () {
        updatePin(pin);
      });
    });
    socket.on("error", connectFalse);
    socket.on("disconnect", connectFalse);
    socket.on("reconnect_attempt", connectFalse);
    socket.on("reconnecting", connectFalse);
    socket.on("resconnect_error", connectFalse);
    socket.on("reconnect_failed", connectFalse);
    socket.on("connect", connectTrue);
    socket.on("reconnect", connectTrue);
    socket.emit("requestPins");
    $scope.togglePin = function (pin) {
      socket.emit("togglePin", { pin: pin.pin });
    };
  }

  pinCtrl.$inject = [
    "$scope"
  ];

  app.controller("PinCtrl", pinCtrl);
}());
