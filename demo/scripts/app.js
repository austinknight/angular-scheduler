angular.module('angularScheduler', ['ngSanitize'])
  .controller('schedulerCtrl', schedulerCtrl)
  .directive('scheduler', scheduler)
  .controller('dummyData', dummyData);

function schedulerCtrl ($q, $scope, $rootScope, $timeout) {
  var scheduleData;

  function setUpCalendar(data, startDay) {
    var scheduleInfo = [];
    scheduleInfo = data;

    var self = $scope;
    self.errors = [];

    var now = moment();
    var rad = startDay || moment().isoWeekday(1);

    // Setting up our initial date rang values
    var daysStart = rad;
    var daysEnd = moment(daysStart).add(6, 'days');
    var daysRange = moment().range(daysStart, daysEnd);
    var daysList = [];
    // Get initial date range for days view
    daysRange.by('days', function(moment) {
      daysList.push({
        'id' : moment.toJSON().split('T')[0],
        'name' : moment.format("ddd, MMMM Do"),
        'dayOfWeek' : moment.format("ddd"),
        'monthDay': moment.format("MMMM Do"),
        'week': moment.isoWeek(),
        'items' : []
      });
    });

    function calculateDuration (startTime, endTime) {
      return moment(startTime).diff(endTime, 'days') + 1;
    }

    function makeScheduleItems (items) {
      var schedule = [];
      var calendarItems = items;

      // Go through each item in the schedule list
      for (var i = 0; i < calendarItems.length; i++) {

        var scheduleItem;
        var calendarItem = calendarItems[i];

        // If item does not have a start time, it shouldn't be shown
        if (calendarItem.schedule.start === null) {
          continue;
        }

        // Duration of the calendar item in days
        // +1 at the end to get true length
        var itemDuration = calculateDuration(calendarItem.schedule.end, calendarItem.schedule.start);

        var scheduleItem = {
          'id' : calendarItem.id,
          'name' : calendarItem.title,
          'date' : moment(calendarItem.schedule.start).toJSON().split('T')[0],
          'start' : moment(calendarItem.schedule.start).toJSON().split('T')[0],
          'end' : moment(calendarItem.schedule.end).toJSON().split('T')[0],
          'duration' : itemDuration
        }

        schedule.push(scheduleItem);
      }

      return schedule;
    }

    function dynamicSort(property) {
      var sortOrder = 1;
      if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
      }
      return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
      }
    }

    //Fetch the data and create schedule items to push into a new items array
    function getBuckets (data){
      var deferred = $q.defer();
      var calendarItems = data;

      var schedule = makeScheduleItems(calendarItems);

      schedule.sort(dynamicSort('start'));

      return schedule;
    };

    function trimItemsToRange (items, rangeStart, rangeEnd) {
      var trimmedItems = []

      for (var i = 0; i < items.length; i++) {
        var item = items[i];


        var displayLength;
        if (item.start == item.end) {
          item.displayLength = moment(item.start).format('L');
        } else {
          item.displayLength = moment(item.start).format('L') + ' - ' + moment(item.end).format('L');
        }

        // If an item starts and ends within the range, do nothing
        if (item.start >= rangeStart && item.end <= rangeEnd) {
          trimmedItems.push(item);
          continue;
        }

        if ((item.start < rangeStart && item.end < rangeStart) || item.start > rangeEnd) {
          // If an item starts and ends before the first day, don't add it
          // OR if an item starts after the end of our range don't add it
          continue;
        } else if (item.start < rangeStart && item.end >= rangeStart) {
          // If an item starts before the first day but ends after it, crop it to show days left in the available range
          item.start = rangeStart;
          item.duration = calculateDuration(item.end, item.start);
          trimmedItems.push(item);
        }  else if (item.start <= rangeEnd && item.end > rangeEnd) {
          // If an item starts before the last day but ends after it, crop it to show days left in the available range
          item.end = rangeEnd;
          item.duration = calculateDuration(item.end, item.start);
          trimmedItems.push(item);
        }
      }

      return trimmedItems;
    }

    // Iterate through shown days. For each day, iterate through buckets.
    // If bucket item's date matches the day then push the bucket's items into the day
    function placeItems(days) {
      var allScheduleItems = getBuckets(scheduleInfo);
      var scheduleItemsInRange = trimItemsToRange(allScheduleItems, daysList[0].id, daysList[daysList.length - 1].id);

      // Loop through the days
      for (var i = 0; i < days.length; i++) {
        var day = days[i];
        var currentDay = days[i].id;

        // Loop throught the items list
        for (var j = 0; j < scheduleItemsInRange.length; j ++) {
          // item.displayLength = item.duration;
          var item = scheduleItemsInRange[j];
          var itemStart = item.start;
          var itemDuration = item.duration;

          if (item.start == currentDay) {
            // If this is the very first set of items, just list them all in the days we need
            // Don't worry about checking for open spaces yet
            if (j == 0) {
              // Copy, edit, and place first item
              var firstItem = JSON.parse(JSON.stringify(item));
              firstItem['type'] = 'start';
              days[i].items.push(firstItem);

              // Place rest of items
              for (var k = i + 1; k < item.duration + 1; k++) {
                if (days[k]) {
                  days[k].items.push(item);
                }
              }
            } else {
              // If this is not the first set of items...
              // Does our day have any items yet?
              if (day.items.length) {
                // Yes there are items in the day already...
                var placeholderSpot;

                function hasPlaceholderSpot (items) {

                  var hasPlaceholderSpot = false;

                  for (var itemNum = 0; itemNum < items.length; itemNum++) {

                    if ('placeholder' in day.items[itemNum]) {
                      placeholderSpot = itemNum;
                      return true;
                    }
                  }
                }

                // Is there a placeholder available in the list?
                if (hasPlaceholderSpot(day.items)) {

                  // Yes, the is a spot
                  // Replace the spot with the item

                  // Copy, edit, and place first item
                  var firstItem = JSON.parse(JSON.stringify(item));
                  firstItem['type'] = 'start';
                  day.items[placeholderSpot] = firstItem;

                  // Now populate the item out for however long it should be
                  for (var itemDays = 1; itemDays < item.duration; itemDays++) {
                    if (days[i + itemDays].items[placeholderSpot] &&  days[i + itemDays].items[placeholderSpot].placeholder) {
                      days[i + itemDays].items[placeholderSpot] = {};
                      days[i + itemDays].items[placeholderSpot] = item;
                    } else {
                      days[i + itemDays].items.push(item);
                    }


                  }

                } else {
                  // No, there is not a placeholder spot...
                  // Push the item into the last spot in the list
                  // Copy, edit, and place first item
                  var firstItem = JSON.parse(JSON.stringify(item));
                  firstItem['type'] = 'start';
                  day.items.push(firstItem);

                  // Now go and add the items for the rest of it's duration...
                  // Since there was no placeholder spot, we should create some placeholders above the item so it's inline...
                  var itemSlot = day.items.length - 1;

                  for (var dayNum = 1; dayNum < item.duration; dayNum++) {
                    // Does this day have any items yet?

                    if (days[i + dayNum] && days[i + dayNum].items.length) {
                      // Yes, it does...
                      // How long is the list?
                      var listLength = days[i + dayNum].items.length;

                      // Do we need a placeholder to keep the items inline?
                      // list length should equal 1 less then the prev day, if it doesn't we need a placeholder
                      if (listLength == (days[i + dayNum - 1].items.length - 1)) {
                        days[i + dayNum].items.push(item);
                      } else {

                        var numOfPlaceholders =  listLength - (days[i + dayNum].items.length - 1);

                        for (var placeholderDays = 0; placeholderDays < numOfPlaceholders; placeholderDays++) {
                          days[i + dayNum].items.push({
                            name: 'placeholder',
                            start: days[i + placeholderDays].id,
                            placeholder: true
                          });
                        }
                        days[i + dayNum].items.push(item);
                      }

                    } else {
                      // No, not yet...
                      // So push placeholders until we reach the slot we want
                      if (days[i + dayNum]) {
                        for (var slotSpot = 0; slotSpot < itemSlot; slotSpot++) {
                          if (days[i + slotSpot]) {
                            days[i + dayNum].items.push({
                              name: 'placeholder',
                              start: days[i + slotSpot].id,
                              placeholder: true
                            });
                          }
                        }
                        days[i + dayNum].items.push(item);
                      }
                    }
                  }
                }

              } else {
                // If there are no items yet, push the items in
                // Copy, edit, and place first item
                var firstItem = JSON.parse(JSON.stringify(item));
                firstItem['type'] = 'start';
                days[i].items.push(firstItem);

                for (var l = 1; l < item.duration; l++) {
                  if (days[i + l]) {
                    days[i + l].items.push(item);
                  }
                }
              }
            }
          }
        }
      }
    }

    placeItems(daysList);

    self.daysList = daysList;

    // Whatever the current day is
    self.now = now.format("ddd, MMMM Do");

    $timeout(function() {
      $rootScope.$broadcast('schedule-ready');
    }, 0);
  }

  $scope.$on('data-received', function(event, schedule){
    scheduleData = schedule;
    $timeout(function() {
      setUpCalendar(scheduleData);
    }, 0);
  });

  $scope.$on('prev-week', function(event, changeData){
    console.log('prev week');

    var start = moment(changeData.firstDay).subtract(7, 'days');

    $timeout(function() {
      setUpCalendar(scheduleData, start);
      $scope.weekNumber = changeData.week;
    }, 0);
  });

  $scope.$on('next-week', function(event, changeData){
    console.log('next week');

    var start = moment(changeData.firstDay).add(7, 'days');

    $timeout(function() {
      setUpCalendar(scheduleData, start);
      $scope.weekNumber = changeData.week;
    }, 0);
  });

  $scope.$on('current-week', function(){
    console.log('current week');

    var start = moment();

    $timeout(function() {
      $scope.weekNumber = moment().isoWeek();
      setUpCalendar(scheduleData, start);
    }, 0);
  });
}

// Scheduler Directive
function scheduler ($rootScope, $timeout) {
  return {
    restrict: 'EA',
    controllerAs: 'scheduler',
    controller: 'schedulerCtrl',
    template: [
      '<div class="ang-sched-wrap">',
        '<div class="outter-block-wrap">',
          '<div class="ang-sched-days block-wrap">',
            '<div class="headings-row">',
              '<div class="block-heading-wrap" ng-repeat="day in daysList">',
                '<h3 class="block-heading">{{day.dayOfWeek}},<br>{{day.monthDay}}</h3>',
              '</div>',
            '</div>',
            '<div class="inner-block-wrap">',
              '<div class="scroll-container">',
                '<div ng-repeat="day in daysList" class="block" data-date="{{day.id}}" data-week-number="{{day.week}}" ng-class="{\'current-day\': day.name === now, \'first-block\': $first, \'last-block\': $last}">',
                  '<div class="block-inner-wrap">',
                    '<section class="block-content">',
                        '<div ng-repeat="item in day.items" class="block-item {{item.id}}" ng-class="{\'span{{item.duration}}\' : item.type, \'placeholder\' : !item.type}" ng-show="day.items.length">',
                          '<div class="collection-title" ng-bind-html="item.name"></div>',
                          '<div class="collection-length" ng-bind-html="item.displayLength"></div>',
                        '</div>',
                    '</section>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="calendar-controls">',
          '<ul class="controls-wrap">',
            '<li class="control control-prev" ng-click="prevWeek()">&#10094;</li>',
            '<li class="control"><span class="calendar-week">Week {{weekNumber}}</span><br><a class="current-link" ng-click="currentWeek()">Current Week</a></li>',
            '<li class="control control-next" ng-click="nextWeek()">&#10095;</li>',
          '</ul>',
        '</div>',
      '</div>'
    ].join(''),
    link: function($scope, $elem, $attrs){
      var data = JSON.parse($attrs.scheduleData);
      $rootScope.$broadcast('data-received', data);

      var weekNum = moment().isoWeek();

      $scope.weekNumber = weekNum;

      $scope.nextWeek = function() {
        var firstBlock = $('.block')[0];
        var currentFirstDay = $(firstBlock).data('date');
        var currentWeek = $(firstBlock).data('weekNumber');

        if (currentWeek == 52) {
          currentWeek = 1;
        } else {
          currentWeek++;
        }

        var changeData = {
          firstDay : currentFirstDay,
          week     : currentWeek
        };

        $rootScope.$broadcast('next-week', changeData);
      }

      $scope.prevWeek = function() {
        var firstBlock = $('.block')[0];
        var currentFirstDay = $(firstBlock).data('date');
        var currentWeek = $(firstBlock).data('weekNumber');

        if (currentWeek == 1) {
          currentWeek = 52;
        } else {
          currentWeek--;
        }

        var changeData = {
          firstDay : currentFirstDay,
          week     : currentWeek
        };

        $rootScope.$broadcast('prev-week', changeData);
      }

      $scope.currentWeek = function() {
        $rootScope.$broadcast('current-week');
      }

      $scope.$on('schedule-ready', function(){
        function equalHeight(group) {
          tallest = 0;
          group.each(function() {
            thisHeight = $(this).height();
            if(thisHeight > tallest) {
              tallest = thisHeight;
            }
          });
          group.height(tallest);
        }

        equalHeight($('.block-inner-wrap'));
      });
    }
  };
}

function dummyData ($scope) {
  $scope.stuff = [
    {
      "id": "Zkfh4kYjb",
      "description": "Creative Content - general text/markdown/html/whatever",
      "featured": false,
      "schedule": {
        "start": null,
        "end": null
      },
      "sites": [
        "steepandcheap"
      ],
      "title": "Cool stuff",
      "slug": "cool-stuff"
    },
    {
      "id": "7351",
      "description": "Men's clothing on sales. This is your opportunity to look good without going broke.",
      "featured": true,
      "schedule": {
        "start": "2014-12-20T00:00:00.000Z",
        "end": "2014-12-21T05:56:13.927Z"
      },
      "sites": [
        "steepandcheap"
      ],
      "title": "Men's Collection",
      "slug": "mens-apparel-sale",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7351.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7351.jpg"
        }
      }
    },
    {
      "id": "7333",
      "title": "Men's Apparel Sale",
      "slug": "mens-apparel-sale",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7333.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7333.jpg"
        }
      },
      "description": "Men's clothing on sale. This is your opportunity to look good without going broke.",
      "featured": false,
      "schedule": {
        "start": "2014-12-21T00:00:00.000Z",
        "end": "2014-12-21T06:02:10.927Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7339",
      "title": "Beanies & Goggles",
      "slug": "beanies-and-goggles",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7339.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7339.jpg"
        }
      },
      "description": "It's in this collection if it goes on your head.",
      "featured": false,
      "schedule": {
        "start": "2014-11-05T00:00:00.000Z",
        "end": "2014-11-08T06:01:11.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7337",
      "title": "Men's Jackets",
      "slug": "mens-jackets",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7337.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7337.jpg"
        }
      },
      "description": "Zip up, button up, and stay warm and dry. Grab a jacket for any season.",
      "featured": false,
      "schedule": {
        "start": "2014-12-10T00:00:00.000Z",
        "end": "2014-12-12T06:08:36.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7375",
      "title": "Men's New Arrivals",
      "slug": "mens-new-arrivals",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7375.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7375.jpg"
        }
      },
      "description": "Fresh finds are lined up and ready for you. Get the good stuff and get if first with this\r\ncollection of brand new apparel for guys.",
      "featured": false,
      "schedule": {
        "start": "2014-12-12T00:00:00.000Z",
        "end": "2014-12-12T05:54:47.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    // {
    //   "id": "7371",
    //   "title": "Accessories Sale",
    //   "slug": "accessories-sale",
    //   "image": {
    //     "url": {
    //       "square": "http://www.steepandcheap.com/images/collections/small/7371.jpg",
    //       "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7371.jpg"
    //     }
    //   },
    //   "description": "Everything in this collection is about the details because details matter.",
    //   "featured": false,
    //   "schedule": {
    //     "start": "2014-12-15T00:00:00.000Z",
    //     "end": "2014-12-18T05:57:23.159Z"
    //   },
    //   "sites": [
    //     "steepandcheap"
    //   ]
    // },
    {
      "id": "7377",
      "title": "Buyers' Picks For August",
      "slug": "buyers-picks-for-august",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7377.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7377.jpg"
        }
      },
      "description": "Our buyers dug deep into their list of favorites to create this collection.",
      "featured": false,
      "schedule": {
        "start": "2014-12-09T00:00:00.000Z",
        "end": "2014-12-15T06:07:14.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7373",
      "title": "Stoic",
      "slug": "stoic",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7373.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7373.jpg"
        }
      },
      "description": "Thrive in your element with clothing, camping gear, and outerwear from Stoic.",
      "featured": false,
      "schedule": {
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-16T06:09:41.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7381",
      "title": "Active Women",
      "slug": "active-women",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7381.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7381.jpg"
        }
      },
      "description": "If you feel good when you work out, youll and push yourself harder. Maybe it's the way quality activewear keeps you comfortable despite the sweat, or maybe it's just the instant confidence boost you get when you slide into a new gym outfit.",
      "featured": false,
      "schedule": {
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-16T06:11:44.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7419",
      "title": "Hoodies!",
      "slug": "hoodies",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7419.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7419.jpg"
        }
      },
      "description": "The right hoody never goes out of style. Plus, you'll always be warm and comfortable.",
      "featured": false,
      "schedule": {
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-17T06:00:18.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7921",
      "title": "Save On Women's Down & Insulation",
      "slug": "save-on-womens-down-and-insulation",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7921.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7921.jpg"
        }
      },
      "description": "Down and synthetic insulated jackets are key to staying comfortable through winter. Get something for yourself or snag a present for someone else.",
      "featured": false,
      "schedule": {
        "start": "2014-09-24T00:00:00.000Z",
        "end": "2014-09-25T05:55:08.229Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7871",
      "title": "Get Preseason Deals on Ski Essentials",
      "slug": "get-preseason-deals-on-ski-essentials",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7871.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7871.jpg"
        }
      },
      "description": "Skiing can be on the expensive side, so it's best to get the deals when they're available. This collection is a mix of discounted skis, boots, helmets, packs and more. Hurry, the pre-season rush is right around the corner.",
      "featured": false,
      "schedule": {
        "start": "2014-09-24T00:00:00.000Z",
        "end": "2014-09-25T06:02:27.229Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7919",
      "title": "Save On Men's Down & Insulation",
      "slug": "save-on-mens-down-and-insulation",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7919.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7919.jpg"
        }
      },
      "description": "Down and synthetic insulated jackets are key to staying comfortable through winter. Get something for yourself or snag a present for someone else.",
      "featured": false,
      "schedule": {
        "start": "2014-09-24T00:00:00.000Z",
        "end": "2014-09-25T06:06:41.229Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7923",
      "title": "Get Baselayers On Sale Up To 60% Off",
      "slug": "get-baselayers-on-sale-up-to-60-off",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7923.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7923.jpg"
        }
      },
      "description": "Baselayers offer warmth and comfort through fall and winter. Don't skimp on something so small, get yourself a new synthetic or natural top or bottom and smile while you save.",
      "featured": false,
      "schedule": {
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-26T06:10:24.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7925",
      "title": "Conquer The Wind & Rain",
      "slug": "conquer-the-wind-and-rain",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7925.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7925.jpg"
        }
      },
      "description": "Our buyers picked a collection of rain and wind jackets at reasonable prices. A waterproof jacket is a staple for anyone living in the city and anyone who regularly travels in the outdoors.",
      "featured": false,
      "schedule": {
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-26T06:10:25.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7937",
      "title": "Get Stoic Up To 60% Off",
      "slug": "get-stoic-up-to-60-off",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7937.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7937.jpg"
        }
      },
      "description": "Stoic helps you thrive in your element. This is high-performance outerwear, camping gear, and clothing for men and women.",
      "featured": false,
      "schedule": {
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-27T05:51:45.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7953",
      "title": "Save Up To 70% Off Women's Fall Fashions",
      "slug": "save-up-to-70-off-womens-fall-fashions",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7953.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7953.jpg"
        }
      },
      "description": "The best women's fall fashions in one place and at reasonable prices. You don't have to worry about coupons, exclusions, or fine print, these deals are easy and ripe for the picking.",
      "featured": false,
      "schedule": {
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-27T05:53:24.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7715",
      "title": "Up to 60% off Road Bike",
      "slug": "up-to-60-off-road-bike",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7715.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7715.jpg"
        }
      },
      "description": "For the first time ever on Steepandcheap, Pinarello bicycles have made there way into this epic road biking collection. Great deals on bikes, apparel, components and more.",
      "featured": false,
      "schedule": {
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-27T05:58:17.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7935",
      "title": "Last Chance Summer Savings - Save Up To 75% Off",
      "slug": "last-chance-summer-savings---save-up-to-75-off",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7935.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7935.jpg"
        }
      },
      "description": "Treat this as your last call to save on swimwear, summer clothes, and summer accessories. You might not see these deals again until spring, so take advantage while you can.",
      "featured": false,
      "schedule": {
        "start": "2014-12-18T00:00:00.000Z",
        "end": "2014-12-18T06:11:17.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7939",
      "title": "Save On Men's Marmot",
      "slug": "save-on-mens-marmot",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7939.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7939.jpg"
        }
      },
      "description": "Men's apparel from one of the outdoor's best brands.",
      "featured": false,
      "schedule": {
        "start": "2014-12-18T00:00:00.000Z",
        "end": "2014-12-20T06:00:17.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7959",
      "title": "Find Men's Performance Clothes Up To 60% Off",
      "slug": "find-mens-performance-clothes-up-to-60-off",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7959.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7959.jpg"
        }
      },
      "description": "Snag a performance shirt or a pair of shorts to keep you looking good through the shoulder season. These clothes are perfect for training outside or at the gym.",
      "featured": false,
      "schedule": {
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-28T06:01:03.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7963",
      "title": "Get Deals On Camp Gear For The Great Outdoors",
      "slug": "get-deals-on-camp-gear-for-the-great-outdoors",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7963.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7963.jpg"
        }
      },
      "description": "Roughing it doesn't have to mean blowing the bank. Score deep deals on camp gear and accessories so you can enjoy the great outdoors for less.",
      "featured": false,
      "schedule": {
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-28T06:04:15.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7961",
      "title": "Stock Up On Women's Outerwear For Less",
      "slug": "stock-up-on-womens-outerwear-for-less",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7961.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7961.jpg"
        }
      },
      "description": "Technical outerwear is on sale. Snag jackets and pants for the worse weather.",
      "featured": false,
      "schedule": {
        "start": "2014-12-20T00:00:00.000Z",
        "end": "2014-12-23T06:05:59.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7955",
      "title": "Find Women's Performance Clothes Up To 60% Off",
      "slug": "find-womens-performance-clothes-up-to-60-off",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7955.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7955.jpg"
        }
      },
      "description": "Snag a performance shirt or a pair of shorts to keep you looking good through the shoulder season. These clothes are perfect for training outside or at the gym.",
      "featured": false,
      "schedule": {
        "start": "2014-12-19T00:00:00.000Z",
        "end": "2014-12-19T06:14:41.852Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7985",
      "title": "Men's Bottoms On Sale",
      "slug": "mens-bottoms-on-sale",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7985.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7985.jpg"
        }
      },
      "description": "Bottoms are easy to come by, but it's not always easy to find them at a great price. Refresh your look by grabbing a pair of pants for work or play.",
      "featured": false,
      "schedule": {
        "start": "2014-12-19T00:00:00.000Z",
        "end": "2014-12-19T05:59:57.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "79856",
      "title": "Men's Bottoms On Sale Again",
      "slug": "mens-bottoms-on-sale",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7985.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7985.jpg"
        }
      },
      "description": "Bottoms are easy to come by, but it's not always easy to find them at a great price. Refresh your look by grabbing a pair of pants for work or play.",
      "featured": false,
      "schedule": {
        "start": "2014-12-19T00:00:00.000Z",
        "end": "2014-12-19T05:59:57.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "79857",
      "title": "Men's Bottoms On Sale Some More",
      "slug": "mens-bottoms-on-sale",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7985.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7985.jpg"
        }
      },
      "description": "Bottoms are easy to come by, but it's not always easy to find them at a great price. Refresh your look by grabbing a pair of pants for work or play.",
      "featured": false,
      "schedule": {
        "start": "2014-12-19T00:00:00.000Z",
        "end": "2014-12-19T05:59:57.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "79858",
      "title": "Men's Bottoms On Sale For Another Time!",
      "slug": "mens-bottoms-on-sale",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7985.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7985.jpg"
        }
      },
      "description": "Bottoms are easy to come by, but it's not always easy to find them at a great price. Refresh your look by grabbing a pair of pants for work or play.",
      "featured": false,
      "schedule": {
        "start": "2014-12-19T00:00:00.000Z",
        "end": "2014-12-19T05:59:57.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7945",
      "title": "Save Up To 60% Off Beanies & Gloves",
      "slug": "save-up-to-60-off-beanies-and-gloves",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7945.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7945.jpg"
        }
      },
      "description": "Beanies and gloves are the little things that make all the difference on a chilly fall night or a cold winter morning. These deals make it easy to keep a few extras at the house or in your car or truck so you're always ready and always warm.",
      "featured": false,
      "schedule": {
        "start": "2014-12-17T00:00:00.000Z",
        "end": "2014-12-19T06:05:33.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7989",
      "title": "Shop Exclusive Holiday Deals",
      "slug": "mens-tops",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7989.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7989.jpg"
        }
      },
      "description": "Shop Exclusive Holiday Deals",
      "featured": false,
      "schedule": {
        "start": "2014-12-18T00:00:00.000Z",
        "end": "2015-01-01T06:07:33.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    }
  ];
}