angular.module('angularScheduler', [])
  .directive('scheduler', scheduler);

// Scheduler Directive
function scheduler () {
  return {
    restrict: 'EA',
    controllerAs: 'scheduler',
    controller: function ($scope) {
      var self = $scope;

      var count = 0;
      var months = [];

      while (count < 12) months.push(moment().month(count++).format("MMMM"));

      self.months = months;

      self.days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    },
    // template: [
      
    // ].join(''),
    link: function($scope, $element, $attrs){

    }
  };
}