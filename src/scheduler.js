angular.module('angularScheduler', [])
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
        daysList.push(moment.format("ddd, MMMM Do"));
      });

      self.getPastDays = function () {
        daysStart = daysStart.subtract(1, 'days');
        self.daysList.unshift(daysStart.format("ddd, MMMM Do"));
      }

      self.getfutureDays = function () {
        daysEnd = daysEnd.add(1, 'days');
        self.daysList.push(daysEnd.format("ddd, MMMM Do"));
      }

      self.daysList = daysList;

      self.now = now.format("ddd, MMMM Do");

      self.loadMore = function() {
        console.log('test')
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
        
        var wrapper = angular.element($elem[0].firstElementChild)
          , raw = $elem[0].firstElementChild;

        wrapper.bind('scroll', function() {
          var maxScrollLeft = raw.scrollWidth - 1;
          if (raw.scrollLeft + raw.offsetWidth <= raw.offsetWidth) {
            $scope.$apply($scope.getPastDays);
            $(wrapper).scrollLeft($('.block:nth-child(2)').position().left - 5);
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