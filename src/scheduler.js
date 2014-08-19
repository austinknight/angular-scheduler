angular.module('angularScheduler', [])
  .directive('scheduler', scheduler);

// Scheduler Directive
function scheduler ($timeout) {
  return {
    restrict: 'EA',
    controllerAs: 'scheduler',
    controller: function ($scope) {
      var self = $scope;

      // Set the days in a week
      self.days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

      // Get the months in the year
      var monthCount = 0;
      var months = [];

      while (monthCount < 12) months.push(moment().month(monthCount++).format("MMMM"));

      self.months = months;

      // Get initial date range for days view
      var now = moment()
        , daysStart = moment().subtract(7, 'days')
        , daysEnd = moment().add(14, 'days')
        , daysRange = moment().range(daysStart, daysEnd)
        , daysList = [];


      var setRange = daysRange.by('days', function(moment) {
        daysList.push(moment.format("dddd, MMMM Do"));
      });
      self.daysList = daysList;
      console.log(daysList);
    },
    link: function($scope, $elem, $attrs){
      

      $timeout(function() {
        var blockWrap = $($elem).find('.block-wrap')
          , blocks = $($elem).find('.block')
          , totalBlockWidths = 0;

        console.log(totalBlockWidths);
        
        $.each(blocks, function(index, value) {
          totalBlockWidths = totalBlockWidths + $(value).outerWidth();
        });
        console.log(totalBlockWidths);

        blockWrap.width(totalBlockWidths);
      }, 0);
    }
  };
}