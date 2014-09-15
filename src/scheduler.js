angular.module('angularScheduler', ['ngQuickDate'])
  .service('SchedulerService', SchedulerService)
  .directive('scheduler', scheduler);

function SchedulerService ($http) {
  var apiKey = '';

  $http.defaults.headers.common.Authorization = 'Basic ' + btoa(apiKey);

  function getData (url) {
    return $http.get(url);
  }

  return {
    getData: getData
  };
}

// Scheduler Directive
function scheduler ($timeout, SchedulerService, $q) {
  return {
    restrict: 'EA',
    controllerAs: 'scheduler',
    controller: function ($scope) {
      var self = $scope;

      self.errors = [];

      // Setting up our initial date rang values
      var now = moment()
        , daysStart = moment().subtract(7, 'days')
        , daysEnd = moment().add(14, 'days')
        , daysRange = moment().range(daysStart, daysEnd)
        , daysList = [];

      // Get initial date range for days view
      daysRange.by('days', function(moment) {
        daysList.push({
          'id' : moment.toJSON().split('T')[0],
          'name' : moment.format("ddd, MMMM Do"),
          'items' : []
        });
      });

      //Fetch the data and create schedule items to push into a new items array
      // 2 Listings for each item (one for start and one for end)
      // Bucket items by 

      var getBuckets = SchedulerService.getData('').then(function(data){
        var scheduleItems = [];
        var collections = data.data;

        _.each(collections, function(item, index) {
          // If item does not have a start time, it shouldn't be shown
          if (item.schedule.start === null) {
            return;
          }

          // Duration of item in days
          var itemDuration = moment(item.schedule.start).diff(item.schedule.end, 'days') * -1;
          
          var newItem1 = {
            'id' : (item.id + '-start'),
            'name' : item.title,
            'date' : moment(item.schedule.start).format("M/D/YYYY"),
            'duration' : itemDuration
          }

          var newItem2 = {
            'id' : (item.id + '-end'),
            'name' : item.title,
            'date' : moment(item.schedule.end).format("M/D/YYYY"),
            'duration' : itemDuration
          }

          scheduleItems.push(newItem1, newItem2);
        });

        // Sort items from oldest to newest anf bucket by date
        var itemBuckets = _.chain(scheduleItems)
          .sortBy('date')
          .groupBy('date')
          .toArray()
          .value();   

        return itemBuckets;
      });

      // Get days in the past
      // * TODO: Get new day, then check if items in item list match new day and push them in
      self.getPastDays = function () {
        daysStart = moment(daysList[0].id).subtract(1, 'days');
        self.daysList.unshift({
          'id' : daysStart.toJSON().split('T')[0],
          'name' : daysStart.format("ddd, MMMM Do"),
          'items' : []
        });
      }

      // Get days in the future
      // * TODO: Get new day, then check if items in item list match new day and push them in
      self.getfutureDays = function () {
        daysEnd = moment(daysList[daysList.length - 1].id).add(1, 'days');
        self.daysList.push({
          'id' : daysEnd.toJSON().split('T')[0],
          'name' : daysEnd.format("ddd, MMMM Do"),
          'items' : []
        });
      }

      // Add new items
      self.addItem = function (itemName, startDate, endDate) {
        // If the start date is before today, then fail out and return an error
        if ((moment().diff(startDate, 'days') > 0) || moment().diff(startDate, 'minutes') > 0) {
          self.errors.push({'message' : 'Can not add items in the past.'});

          // Remove errors after 10 seconds
          $timeout(function() {
            self.errors = [];
          }, 10000);
          return;
        } else if ((moment(startDate).diff(endDate, 'days') > 0) || (moment(startDate).diff(endDate, 'minutes') > 0)) {
          // Make sure that end date is not before the start date
          self.errors.push({'message' : 'End date can not occur before start date.'});

          // Remove errors after 10 seconds
          $timeout(function() {
            self.errors = [];
          }, 10000);
          return;
        }

        // The new item's start date we want to match with a nay block
        var dayToMatch = moment(startDate).toJSON().split('T')[0];
        
        // Duration of item in days
        var itemDuration = moment(startDate).diff(endDate, 'days') * -1;

        var newItem = {
          'id' : (itemName + dayToMatch),
          'dayMatch' : moment(startDate).toJSON().split('T')[0],
          'name' : itemName,
          'startDate' : moment(startDate).format("M/D/YYYY"),
          'endDate' : moment(endDate).format("M/D/YYYY"),
          'duration' : itemDuration
        }

        // If the item duration is longer than a day, we need to set the item to span multiple day columns
        // Emits event with item info for directive to handle DOM manipulation
        // if (itemDuration > 0) {
        //   self.$emit('setItemWidth', {
        //     'itemId' : itemId 
        //   });
        // }

        // Match new item with a day
        dayToPush =  $.grep(daysList, function(e){ return e.id == dayToMatch; });
        
        // Push new item into matched day
        dayToPush[0].items.push(newItem);

        // Resetting form contents
        self.newItem.start = '';
        self.newItem.end = '';
        self.newItem.name = '';
      }

      self.daysList = daysList;

      // Whatever the current day is
      self.now = now.format("ddd, MMMM Do");
    },
    link: function($scope, $elem, $attrs){
      $timeout(function() {
        // Set the width of the block container to scroll
        
        var setWrapperWidth = function() {
          var deferred = $q.defer();

          var blockWrap = $($elem).find('.block-wrap')
          , blocks = $($elem).find('.block')
          , totalBlockWidths = 0;
          
          $.each(blocks, function(index, value) {
            totalBlockWidths = totalBlockWidths + $(value).outerWidth();
          });

          blockWrap.width(totalBlockWidths);

          deferred.resolve();
          return deferred.promise;
        };



        // Set scroll position of schedule wrapper to current day on load
        

        
        setWrapperWidth().then(function(){
          var currentDayPos = $('.current-day').position().left;
          $('.outter-block-wrap').scrollLeft(currentDayPos - 20);
        });
        

        // Checking if we have scrolled to first/last blocks, then load in more days
        var firstBlockPos = $('.first-block')
          , lastBlockPos = $('.last-block');
        
        var wrapper = $('.outter-block-wrap')
          , raw = $('.outter-block-wrap')[0];

        wrapper.bind('scroll', function() {
          var maxScrollLeft = raw.scrollWidth - 1;
          if (raw.scrollLeft + raw.offsetWidth <= raw.offsetWidth) {
            $scope.$apply($scope.getPastDays(1));
            $(wrapper).scrollLeft(1);
            setWrapperWidth();
          } else if (raw.scrollLeft + raw.offsetWidth >= maxScrollLeft) {
            $scope.$apply($scope.getfutureDays);
            setWrapperWidth();
          }
        });

        
        $scope.$on('testing', function(){
          setWrapperWidth().then(function(){
            var currentDayPos = $('.current-day').position().left;
            $('.outter-block-wrap').scrollLeft(currentDayPos - 20);
          });
        });

      }, 0);
    }
  };
}