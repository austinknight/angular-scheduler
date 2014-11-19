angular.module('angularScheduler', ['ngSanitize'])
  .service('SchedulerService', SchedulerService)
  .controller('schedulerCtrl', schedulerCtrl)
  .directive('scheduler', scheduler);

function SchedulerService ($q, $rootScope, $timeout) {
  var scheduleData;

  function setData(data) {
    scheduleData = data;
    $timeout(function() {
      $rootScope.$broadcast('data-received');
    }, 0);
  }

  function getData () {
    var deferred = $q.defer();
    deferred.resolve(scheduleData);
    return deferred.promise;
  }

  return {
    setData: setData,
    getData: getData
  };
}

function schedulerCtrl ($scope, $rootScope, SchedulerService, $timeout) {
  $scope.$on('data-received', function(){
    var self = $scope;
    self.errors = [];

    // Setting up our initial date rang values
    var now = moment()
      , daysStart = moment().subtract(43, 'days')
      , daysEnd = moment().add(28, 'days')
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
    var getBuckets = SchedulerService.getData().then(function(data){
      var scheduleItems = [];
      var collections = data;

      _.each(collections, function(item, index) {
        // If item does not have a start time, it shouldn't be shown
        if (item.schedule.start === null) {
          return;
        }

        // Duration of item in days
        var itemDuration = moment(item.schedule.start).diff(item.schedule.end, 'days') * -1;

        var newItem1 = {
          'id' : item.id,
          'name' : item.title,
          'date' : moment(item.schedule.start).toJSON().split('T')[0],
          'start' : moment(item.schedule.start).toJSON().split('T')[0],
          'end' : moment(item.schedule.end).toJSON().split('T')[0],
          'duration' : itemDuration,
          'type' : 'start'
        }

        var newItem2 = {
          'id' : item.id,
          'name' : item.title,
          'date' : moment(item.schedule.end).toJSON().split('T')[0],
          'start' : moment(item.schedule.start).toJSON().split('T')[0],
          'end' : moment(item.schedule.end).toJSON().split('T')[0],
          'duration' : itemDuration,
          'type' : 'end'
        }

        scheduleItems.push(newItem1, newItem2);
      });

      // Sort items from oldest to newest anf bucket by date
      var itemBuckets = _.chain(scheduleItems)
        .sortBy('date')
        .groupBy('date')
        .toArray()
        .value();

      var schedule = [];
      var index;

      _.each(itemBuckets, function(items){
        var bucketDate = items[0].date;
        var now = (_.last(schedule) || []).slice(0);

        _.each(items, function(item){
          if (item.type == 'start') {

            _.find(now, function(obj, pos){

              if (!obj.id) {
                index = pos;

                return true;
              }
            });


            if (index === -1 || _.isUndefined(index)) {
              index = now.length;
            }

            now[index] = item;

            index = -1;

          } else {
            _.find(now, function(obj){
              if (obj.id === item.id) {
                index = _.indexOf(now, obj);
                return true;
              } else {
                index = -1;
                return false;
              }
            });

            if (index !== -1) {
              now[index] = {};
            }
          }
        });

        now.date = bucketDate;

        schedule.push(now);
      });

      return schedule;
    });

    // Iterate through shown days. For each day, iterate through buckets.
    // If bucket item's date matches the day then push the bucket's items into the day
    function placeItems() {

      _.each(daysList, function(day, index){
        var currentDate = day.id;
        day.items = [];

        getBuckets.then(function(schedule){

          _.each(schedule, function(bucket){

            if (bucket.date == currentDate) {

              _.each(bucket, function(item, index){
                var firstDay = daysList[0].id;
                var lastDay = daysList[daysList.length - 1].id;

                if (item.start < firstDay && item.end > firstDay) {
                  item.start = firstDay;
                  item.duration = moment(firstDay).diff(item.end, 'days') * -1;
                }
                /*
                  If an item's start date is within the current date range, but it's end date is not,
                  we should push a placeholder that ends at whatever our last day is in the list. It should
                  be re-adjusted for each day we add until we reach the real end date.
                */
                if (item.start >= firstDay && item.start <= lastDay && item.end > lastDay) {
                  item.end = lastDay;
                  item.duration = moment(item.start).diff(item.end, 'days') * -1 + 1;
                }

                if (item.start == currentDate) {
                  item.display = true;
                  day.items.push(item);
                } else {
                  day.items.push({'display': false});
                }

              });
            }
          });

        });
      });
    }

    placeItems();

    self.daysList = daysList;

    // Whatever the current day is
    self.now = now.format("ddd, MMMM Do");

    $timeout(function() {
      $rootScope.$broadcast('schedule-ready');
    }, 0);
  });
}

// Scheduler Directive
function scheduler ($timeout, SchedulerService, $q, $rootScope) {
  return {
    restrict: 'EA',
    controllerAs: 'scheduler',
    controller: 'schedulerCtrl',
    link: function($scope, $elem, $attrs){
      $scope.$on('schedule-ready', function(){
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

          setWrapperWidth().then(function(){
            var currentDayPos = $('.current-day').position().left;
            $('.outter-block-wrap').scrollLeft(currentDayPos - 20);
          });
        }, 0);
      });
    }
  };
}