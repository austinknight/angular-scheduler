angular.module('angularScheduler', ['ngQuickDate'])
  .directive('scheduler', scheduler);

// Scheduler Directive
function scheduler ($timeout) {
  return {
    restrict: 'EA',
    controllerAs: 'scheduler',
    controller: function ($scope) {
      var self = $scope;

      // Get initial date range for days view
      var now = moment()
        , daysStart = moment().subtract(7, 'days')
        , daysEnd = moment().add(14, 'days')
        , daysRange = moment().range(daysStart, daysEnd)
        , daysList = [];


      daysRange.by('days', function(moment) {
        daysList.push({
          'id' : moment.toJSON().split('T')[0],
          'name' : moment.format("ddd, MMMM Do"),
          'items' : []
        });
      });

      self.getPastDays = function () {
        daysStart = daysStart.subtract(1, 'days');
        self.daysList.unshift({
          'id' : moment.toJSON().split('T')[0],
          'name' : daysStart.format("ddd, MMMM Do"),
          'items' : []
        });
      }

      self.getfutureDays = function () {
        daysEnd = daysEnd.add(1, 'days');
        self.daysList.push({
          'id' : moment.toJSON().split('T')[0],
          'name' : daysEnd.format("ddd, MMMM Do"),
          'items' : []
        });
      }

      self.daysList = daysList;

      self.now = now.format("ddd, MMMM Do");

      // Add new items
      self.addItem = function (itemName, startDate, endDate) {
        var dayToMatch = moment(startDate).toJSON().split('T')[0];

        var newItem = {
          'dayMatch' : moment(startDate).toJSON().split('T')[0],
          'name' : itemName,
          'startDate' : moment(startDate).format("M/D/YYYY"),
          'endDate' : moment(endDate).format("M/D/YYYY")
        }

        dayToPush =  $.grep(daysList, function(e){ return e.id == dayToMatch; });
        // dayToPush.items.push(item);
        dayToPush[0].items.push(newItem);

        self.newItem.start = '';
        self.newItem.end = '';
        self.newItem.name = '';
      }
    },
    link: function($scope, $elem, $attrs){
      $timeout(function() {
        // Set the width of the block container to scroll
        var setWrapperWidth = function() {
          var blockWrap = $($elem).find('.block-wrap')
          , blocks = $($elem).find('.block')
          , totalBlockWidths = 0;
          
          $.each(blocks, function(index, value) {
            totalBlockWidths = totalBlockWidths + $(value).outerWidth();
          });

          blockWrap.width(totalBlockWidths);
        };

        setWrapperWidth();

        // Set scroll position of schedule wrapper to current day on load
        var currentDayPos = $('.current-day').position().left;

        $('.outter-block-wrap').scrollLeft(currentDayPos - 20);

        // Checking if we have scrolled to first/last blocks, then load in more days
        var firstBlockPos = $('.first-block')
          , lastBlockPos = $('.last-block');
        
        var wrapper = $('.outter-block-wrap')
          , raw = $('.outter-block-wrap')[0];

          console.log(wrapper)

        wrapper.bind('scroll', function() {
          var maxScrollLeft = raw.scrollWidth - 1;
          if (raw.scrollLeft + raw.offsetWidth <= raw.offsetWidth) {
            $scope.$apply($scope.getPastDays);
            $(wrapper).scrollLeft(1);
            setWrapperWidth();
          } else if (raw.scrollLeft + raw.offsetWidth >= maxScrollLeft) {
            $scope.$apply($scope.getfutureDays);
            setWrapperWidth();
          }
        });

      }, 0);
    }
  };
}