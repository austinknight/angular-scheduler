angular.module('angularScheduler', ['ngSanitize'])
  .controller('schedulerCtrl', schedulerCtrl)
  .directive('scheduler', scheduler)
  .controller('dummyData', dummyData);

function schedulerCtrl ($q, $scope, $rootScope, $timeout) {
  $scope.$on('data-received', function(event, testData){
    var testing = testData;
    var self = $scope;
    self.errors = [];

    // Setting up our initial date range values
    var now = moment()
      , daysStart = moment(now)
      , daysEnd = moment().add(6, 'days')
      , daysRange = moment().range(daysStart, daysEnd)
      , daysList = [];

    // Get initial date range for days view
    daysRange.by('days', function(moment) {
      daysList.push({
        'id' : moment.toJSON().split('T')[0],
        'name' : moment.format("ddd, MMMM Do"),
        'dayOfWeek' : moment.format("ddd"),
        'monthDay': moment.format("MMMM Do"),
        'items' : []
      });
    });

    //Fetch the data and create schedule items to push into a new items array
    function getBuckets (data){
      var deferred = $q.defer();
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

      // return schedule;
      deferred.resolve(schedule);
      return deferred.promise;
    };

    // Iterate through shown days. For each day, iterate through buckets.
    // If bucket item's date matches the day then push the bucket's items into the day
    function placeItems() {
      _.each(daysList, function(day, index){
        var currentDate = day.id;
        day.items = [];

        getBuckets(testing).then(function(schedule){

          _.each(schedule, function(bucket){

            if (bucket.date == currentDate) {

              _.each(bucket, function(item, index){
                var firstDay = daysList[0].id;
                var lastDay = daysList[daysList.length - 1].id;

                if (item.start <= firstDay && item.end >= firstDay) {
                  item.start = firstDay;
                  console.log(moment(firstDay).diff(item.end, 'days') * -1)
                  item.duration = moment(firstDay).diff(item.end, 'days') * -1;
                }
                /*
                  If an item's start date is within the current date range, but it's end date is not,
                  we should push a placeholder that ends at whatever our last day is in the list. It should
                  be re-adjusted for each day we add until we reach the real end date.
                */
                if (item.start >= firstDay && item.start <= lastDay && item.end > lastDay) {
                  item.end = lastDay;
                  item.duration = moment(item.start).diff(lastDay, 'days') * -1 + 1;
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
function scheduler ($timeout, $q, $rootScope, $parse) {
  return {
    restrict: 'EA',
    controllerAs: 'scheduler',
    controller: 'schedulerCtrl',
    template: [
      '<div class="ang-sched-wrap">',
        '<div ng-show="errors.length > 0">',
          '<div ng-repeat="error in errors">',
            '{{error.message}}',
          '</div>',
        '</div>',
        '<div class="outter-block-wrap">',
          '<div class="ang-sched-days block-wrap">',
            '<div class="headings-row">',
              '<h3 ng-repeat="day in daysList" class="block-heading">{{day.dayOfWeek}},<br>{{day.monthDay}}</h3>',
            '</div>',
            '<div class="inner-block-wrap">',
              '<div ng-repeat="day in daysList" class="block" ng-class="{\'current-day\': day.name === now, \'first-block\': $first, \'last-block\': $last}">',
                '<div class="block-inner-wrap">',
                  '<section class="block-content">',
                    '<div ng-repeat="item in day.items" class="block-item {{item.id}}" ng-class="{\'span{{item.duration}}\' : item.display, \'placeholder\' : !item.display}" ng-show="day.items.length">',
                      '<div class="collection-title"><strong ng-bind-html="item.name"></strong></div>',
                    '</div>',
                  '</section>',
                '</div>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join(''),
    link: function($scope, $elem, $attrs){
      //May want to replace this with $parse
      var data = JSON.parse($attrs.scheduleData);
      $rootScope.$broadcast('data-received', data);

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
            $('.outter-block-wrap').scrollLeft(currentDayPos - 244);
          });
        }, 0);
      });
    }
  };
}

function dummyData ($scope) {
  $scope.stuff = [
    {
      "id": "8515",
      "title": "Shop Exclusive Holiday Deals",
      "slug": "shop-exclusive-holiday-deals",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/8515.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/8515.jpg"
        }
      },
      "description": "Stock up on our exclusive holiday deals!",
      "featured": false,
      "schedule": {
        "start": "2014-12-07T00:00:00.000Z",
        "end": "2014-12-13T07:05:48.676Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "8959",
      "title": "Treat Your Feet",
      "slug": "treat-your-feet",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/8959.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/8959.jpg"
        }
      },
      "description": "Start the new year off right with a fresh pair of kicks from our collection of shoes, boots, & more.",
      "featured": false,
      "schedule": {
        "start": "2014-12-09T00:00:00.000Z",
        "end": "2014-12-11T07:09:11.676Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "8951",
      "title": "Gifts For Your Little Buddy - Make Junior's Year",
      "slug": "gifts-for-your-little-buddy---make-juniors-year",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/8951.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/8951.jpg"
        }
      },
      "description": "Sure, you might want an ice axe for the holidays, but that doesn't mean that Junior should have one. Take the safe route and check out our collection of gifts for the little ones.",
      "featured": false,
      "schedule": {
        "start": "2014-12-12T00:00:00.000Z",
        "end": "2014-18-07T07:08:55.676Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "8973",
      "title": "Save On Icebreaker Dood",
      "slug": "save-on-icebreaker",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/8973.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/8973.jpg"
        }
      },
      "description": "Get the temperature-regulating power and odor-blocking awesomeness of merino wool. And, thanks to this collection, you can get it for less than you'd pay for most synthetics. ",
      "featured": false,
      "schedule": {
        "start": "2014-12-10T00:00:00.000Z",
        "end": "2014-12-15T07:07:08.676Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "8949",
      "title": "Keep Them Safe",
      "slug": "keep-them-safe",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/8949.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/8949.jpg"
        }
      },
      "description": "Let's face it, you worry while your loved ones are out in the wild. Do what you can to keep them safe with our collection of safety gear.",
      "featured": false,
      "schedule": {
        "start": "2014-12-04T00:00:00.000Z",
        "end": "2014-12-07T07:06:17.676Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "8695",
      "title": "Merino Wool - Save on Warmth ",
      "slug": "merino-wool---save-on-warmth",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/8695.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/8695.jpg"
        }
      },
      "description": "Few fibers, synthetic or natural, can come close to matching the wicking & warming power of Merino wool. It can hold a third of its weight in moisture & it's also naturally antimicrobial. ",
      "featured": false,
      "schedule": {
        "start": "2014-12-09T00:00:00.000Z",
        "end": "2014-12-11T07:05:23.676Z"
      },
      "sites": [
        "steepandcheap"
      ]
    }
  ];
}