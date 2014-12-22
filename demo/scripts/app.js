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
        } else if (item.start < rangeStart && item.end >= rangeStart && item.end <= rangeEnd) {
          // If an item starts before the first day but ends after it, crop it to show days left in the available range
          item.start = rangeStart;
          item.duration = calculateDuration(item.end, item.start);
          trimmedItems.push(item);
        } else if (item.start < rangeStart && item.end > rangeEnd) {
          item.start = rangeStart;
          item.end = rangeEnd;
          item.duration = calculateDuration(item.end, item.start);
          trimmedItems.push(item);

        } else if (item.start <= rangeEnd && item.end > rangeEnd) {

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

      for (var dayIndex = 0; dayIndex < days.length; dayIndex++) {
        var day = days[dayIndex];
        var currentDay = days[dayIndex].id;

        // Loop throught the items list
        for (var itemsIndex = 0; itemsIndex < scheduleItemsInRange.length; itemsIndex++) {
          // item.displayLength = item.duration;
          var item = scheduleItemsInRange[itemsIndex];
          var itemStart = item.start;
          var itemDuration = item.duration;

          if (item.start == currentDay) {
            // If this is the very first set of items, just list them all in the days we need
            // Don't worry about checking for open spaces yet
            if (itemsIndex == 0) {
              // Copy, edit, and place first item
              var firstItem = JSON.parse(JSON.stringify(item));
              firstItem['type'] = 'start';
              days[itemsIndex].items.push(firstItem);

              // Place rest of items
              for (var nextDaysIndex = dayIndex + 1; nextDaysIndex < item.duration ; nextDaysIndex++) {
                if (days[nextDaysIndex]) {
                  days[nextDaysIndex].items.push(item);
                }
              }
            } else {
              // If this is not the first set of items...
              // Does our day have any items yet?

              var placeholderSpot;

              function hasPlaceholderSpot (items) {
                for (var itemNum = 0; itemNum < items.length; itemNum++) {

                  if ('placeholder' in day.items[itemNum]) {
                    placeholderSpot = itemNum;
                    return true;
                  }
                }
              }

              function plotItems(slot) {
                var slot = slot;

                for (var l = 1; l < item.duration; l++) {
                    // Check for items in the current day
                    if(days[dayIndex + l].items.length) {
                      // The day has some items so we need to match up the plot with the slot
                      var currentDayLength = days[dayIndex + l].items.length;

                      if (currentDayLength < slot) {
                        while (currentDayLength < slot) {
                          days[dayIndex + l].items.push({
                            name: 'placeholder',
                            placeholder: true
                          });
                          currentDayLength++;
                        }
                        days[dayIndex + l].items.push(item);
                      } else if (currentDayLength > slot) {
                        days[dayIndex + l].items[slot] = item;
                      } else {
                        // The slot and list length match up so push the item
                        days[dayIndex + l].items.push(item);
                      }

                    } else {
                      // There are no items in the day
                      if (slot == 0) {
                        // The slot is the first space so just plot the items out
                        days[dayIndex + l].items.push(item);
                      } else {
                        // Slot is not the first day so we need to push placeholders to match up the plots to the first day
                        var length = 0;
                        while (length < slot) {
                          days[dayIndex + l].items.push({
                            name: 'placeholder',
                            placeholder: true
                          });
                          length++;
                        }
                        days[dayIndex + l].items.push(item);
                      }
                    }
                  }
              }

              if (day.items.length) {
                // Yes there are items in the day already...

                if (hasPlaceholderSpot(day.items)) {
                  var firstItem = JSON.parse(JSON.stringify(item));
                  firstItem['type'] = 'start';

                  days[dayIndex].items[placeholderSpot] = firstItem;

                  plotItems(placeholderSpot);

                } else {
                  // Does not have a placeholder spot, so just push it into the last spot in the list
                  var firstItem = JSON.parse(JSON.stringify(item));
                  firstItem['type'] = 'start';
                  days[dayIndex].items.push(firstItem);

                  plotItems(days[dayIndex].items.length - 1);
                }
              } else {
                // If there are no items yet, push the items in
                // Copy, edit, and place first item
                var firstItem = JSON.parse(JSON.stringify(item));
                firstItem['type'] = 'start';
                days[dayIndex].items.push(firstItem);

                for (var l = 1; l < item.duration; l++) {
                  if (days[dayIndex + l]) {
                    days[dayIndex + l].items.push(item);
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
      "id":"8515",
      "title":"Shop Exclusive Holiday Deals",
      "slug":"shop-exclusive-holiday-deals",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8515.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8515.jpg"
         }
      },
      "description":"Stock up on our exclusive holiday deals!",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2015-01-01T06:56:49.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8841",
      "title":"Shop Gifts For Your Girl",
      "slug":"shop-gifts-for-your-girl",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8841.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8841.jpg"
         }
      },
      "description":"Show her that you care with pieces from our latest collection.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-22T07:10:44.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8843",
      "title":"Shop Gifts For Your Guy",
      "slug":"shop-gifts-for-your-guy",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8843.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8843.jpg"
         }
      },
      "description":"Show him that you care with pieces from our latest collection.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-21T07:11:04.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9149",
      "title":"Stock Up On Ski Gear For Less",
      "slug":"stock-up-on-ski-gear-for-less",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9149.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9149.jpg"
         }
      },
      "description":"Score new ski gear before the next powder day hits.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-21T07:07:31.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8893",
      "title":"Footwear For Less - Stride Into Savings",
      "slug":"footwear-for-less---stride-into-savings",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8893.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8893.jpg"
         }
      },
      "description":"Why spend more than you have to? Our collection of footwear under $50 proves that quality isn't always tied to a hefty price tag.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-20T07:12:22.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8903",
      "title":"Get Levi's On Sale",
      "slug":"get-levis-on-sale",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8903.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8903.jpg"
         }
      },
      "description":"Get deals on one of the best names in denim.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-20T07:10:03.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8791",
      "title":"Score The Perfect Gifts",
      "slug":"score-the-perfect-gifts",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8791.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8791.jpg"
         }
      },
      "description":"To be honest, not everyone on your list is going to get the royal treatment. For your favorite people, however, we've complied awesome deals on everything from snowboards to skis to kayaks. Show 'em you care.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-20T07:06:20.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9113",
      "title":"Save On Icebreaker",
      "slug":"save-on-icebreaker",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9113.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9113.jpg"
         }
      },
      "description":"Get the temperature-regulating power and odor-blocking awesomeness of merino wool. And, thanks to this collection, you can get it for less than you'd pay for most synthetics. ",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-20T07:04:15.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9137",
      "title":"Strap Into Snowboard Savings",
      "slug":"strap-into-snowboard-savings",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9137.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9137.jpg"
         }
      },
      "description":"Score some discounted snowboard gear and surprise your snowboarder with the perfect gift!",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-20T06:56:00.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9117",
      "title":"Waist Deep Discounts",
      "slug":"waist-deep-discounts",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9117.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9117.jpg"
         }
      },
      "description":"The days of pow are here, which means that it's time to cover up & prepare. Start saving on outerwear & accessories to get you covered from the waist down.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-19T07:07:40.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9103",
      "title":"Get Deals On Bags & Packs",
      "slug":"get-deals-on-bags-and-packs",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9103.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9103.jpg"
         }
      },
      "description":"You have stuff, all kinds of stuff. Bars, water, makeup none of it is going to carry itself. Shop our collection of bags, packs, purses, & more to carry it all in style.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-19T06:59:29.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8775",
      "title":"Save On Oakley",
      "slug":"save-on-oakley",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8775.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8775.jpg"
         }
      },
      "description":"Goggles, sunglasses, & outerwear from one of the industry's biggest brands.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-19T06:58:46.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9123",
      "title":"Find Camp Deals Up To 65% Off",
      "slug":"find-camp-deals-up-to-65-off",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9123.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9123.jpg"
         }
      },
      "description":"Score amazing deals on camp gear essentials.",
      "featured":false,
      "schedule":{
         "start":"2014-12-18T00:00:00.000Z",
         "end":"2014-12-19T06:55:43.493Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9077",
      "title":"Save Big On Big Brands",
      "slug":"save-big-on-big-brands",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9077.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9077.jpg"
         }
      },
      "description":"Shop deals from our biggest brands, like Marmot, Mountain Hardwear, & Columbia.",
      "featured":false,
      "schedule":{
         "start":"2014-12-17T00:00:00.000Z",
         "end":"2014-12-18T07:07:32.945Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9081",
      "title":"Men's Size Medium",
      "slug":"mens-size-medium",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9081.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9081.jpg"
         }
      },
      "description":"Shop the latest in men's apparel, all in your size.",
      "featured":false,
      "schedule":{
         "start":"2014-12-17T00:00:00.000Z",
         "end":"2014-12-18T07:05:11.945Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9083",
      "title":"Men's Size Large",
      "slug":"mens-size-large",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9083.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9083.jpg"
         }
      },
      "description":"Shop the latest in men's apparel, all in your size.",
      "featured":false,
      "schedule":{
         "start":"2014-12-17T00:00:00.000Z",
         "end":"2014-12-18T07:03:38.945Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9107",
      "title":"Score Sunglasses, Headphones, & More",
      "slug":"score-sunglasses-headphones-and-more",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9107.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9107.jpg"
         }
      },
      "description":"Get the hottest gifts of the season.",
      "featured":false,
      "schedule":{
         "start":"2014-12-17T00:00:00.000Z",
         "end":"2014-12-18T07:03:21.945Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8921",
      "title":"Save On Stoic",
      "slug":"save-on-stoic",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8921.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8921.jpg"
         }
      },
      "description":"Stoic helps you thrive in your element. This is high-performance outerwear, camping gear, and clothing for men and women.",
      "featured":false,
      "schedule":{
         "start":"2014-12-17T00:00:00.000Z",
         "end":"2014-12-18T07:01:31.945Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9079",
      "title":"Men's Size Small",
      "slug":"mens-size-small",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9079.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9079.jpg"
         }
      },
      "description":"Shop the latest in men's apparel, all in your size.",
      "featured":false,
      "schedule":{
         "start":"2014-12-17T00:00:00.000Z",
         "end":"2014-12-18T06:58:55.945Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8695",
      "title":"Merino Wool - Save on Warmth ",
      "slug":"merino-wool---save-on-warmth",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8695.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8695.jpg"
         }
      },
      "description":"Few fibers, synthetic or natural, can come close to matching the wicking & warming power of Merino wool. It can hold a third of its weight in moisture & it's also naturally antimicrobial. ",
      "featured":false,
      "schedule":{
         "start":"2014-12-17T00:00:00.000Z",
         "end":"2014-12-18T06:54:12.945Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9075",
      "title":"Give the Gift of Gear",
      "slug":"give-the-gift-of-gear",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9075.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9075.jpg"
         }
      },
      "description":"This year, give the gift of gear, and in the process, score some serious brownie points. Our latest collection makes it easy, dishing up our favorite skis, snowboards, kayaks, & more.",
      "featured":false,
      "schedule":{
         "start":"2014-12-16T00:00:00.000Z",
         "end":"2014-12-17T07:13:20.282Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9091",
      "title":"Holiday Gifts Under $50",
      "slug":"holiday-gifts-under-50",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9091.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9091.jpg"
         }
      },
      "description":"Get the perfect gift at the perfect price with our collection of awesome gift ideas for under $50.",
      "featured":false,
      "schedule":{
         "start":"2014-12-16T00:00:00.000Z",
         "end":"2014-12-17T07:06:57.282Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9101",
      "title":"Get Outfitted For The Ski Season",
      "slug":"get-outfitted-for-the-ski-season",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9101.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9101.jpg"
         }
      },
      "description":"Save on all of the ski essentials you'll need for the '14/'15 season.",
      "featured":false,
      "schedule":{
         "start":"2014-12-16T00:00:00.000Z",
         "end":"2014-12-17T07:03:21.282Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9061",
      "title":"Holiday Deals Under $100",
      "slug":"holiday-deals-under-100",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9061.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9061.jpg"
         }
      },
      "description":"It's not too late to score the perfect gift at the perfect price. Shop our collection of some of our favorite gift ideas for under $100.",
      "featured":false,
      "schedule":{
         "start":"2014-12-15T00:00:00.000Z",
         "end":"2014-12-16T06:58:42.558Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9097",
      "title":"Save Big On Fly Fishing & Paddle Gear",
      "slug":"save-big-on-fly-fishing-and-paddle-gear",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9097.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9097.jpg"
         }
      },
      "description":"Grab some new gear for yourself or give your outdoor enthusiast a new setup for next season.",
      "featured":false,
      "schedule":{
         "start":"2014-12-15T00:00:00.000Z",
         "end":"2014-12-16T06:54:45.558Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9053",
      "title":"Give The Gift Of Skis & Boards",
      "slug":"give-the-gift-of-skis-and-boards",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9053.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9053.jpg"
         }
      },
      "description":"Yes, the snow is falling, and accordingly, the runs are opening. Start the season off right with our latest collection of skis, snowboards, boots, bindings, & more.",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T07:10:34.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9089",
      "title":"Hardgoods Grab Bag - 50% To 80% Off",
      "slug":"hardgoods-grab-bag---50-to-80-off",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9089.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9089.jpg"
         }
      },
      "description":"You wish the snow was as deep as these deals.",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T07:05:05.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9099",
      "title":"Give The Gift Of Camp Gear",
      "slug":"give-the-gift-of-camp-gear",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9099.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9099.jpg"
         }
      },
      "description":"Get deals on camping essentials before the holidays.",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T07:04:54.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9035",
      "title":"Men's and Women's Outerwear",
      "slug":"mens-and-womens-outerwear",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9035.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9035.jpg"
         }
      },
      "description":"Logic would have it that plummeting mercury mandates increased protection. Get the coverage you need with our collection of Men's & Women's jackets & pants. ",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T07:01:45.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8749",
      "title":"Fetch Gifts For Your Dog",
      "slug":"fetch-gifts-for-your-dog",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8749.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8749.jpg"
         }
      },
      "description":"From packs to beds, find everything your outdoor dog needs to join you on your next adventure.",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T07:00:56.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9031",
      "title":"Score Simms Fishing Gear for the Holidays",
      "slug":"score-simms-fishing-gear-for-the-holidays",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9031.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9031.jpg"
         }
      },
      "description":"The temps might be dropping, but the fish are certainly still biting. So, to make sure that you don't miss out on your next trophy, get the goods from one of fishing's biggest brands.",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T07:00:29.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"7385",
      "title":"Shop All Things Mountain Bike",
      "slug":"shop-all-things-mountain-bike",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/7385.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7385.jpg"
         }
      },
      "description":"The tourists are gone, the snow has yet to fall, and the trails are primed. This is the best time of the year for trail riding, and it's the best time of year for a new steed. Check out our collection of mountain bikes and hit the dirt.",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T06:57:25.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9011",
      "title":"Find Gifts For Your Yogi",
      "slug":"find-gifts-for-your-yogi",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9011.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9011.jpg"
         }
      },
      "description":"Find the best gifts for the yogi in your life.",
      "featured":false,
      "schedule":{
         "start":"2014-12-13T00:00:00.000Z",
         "end":"2014-12-14T06:56:27.793Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9015",
      "title":"Clothing Accessories Under $25",
      "slug":"clothing-accessories-under-25",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9015.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9015.jpg"
         }
      },
      "description":"We all know the old adage - something old, something new, and so on. Point being is that the accessories will make or break the look. Get the right ones while spending less by shopping our collection of accessories under $25.",
      "featured":false,
      "schedule":{
         "start":"2014-12-12T00:00:00.000Z",
         "end":"2014-12-13T06:58:39.092Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9003",
      "title":"Give The Gift Of The Outdoors - Find Tents & Sleeping Bags On Sale",
      "slug":"give-the-gift-of-the-outdoors---find-tents-and-sleeping-bags-on-sale",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9003.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9003.jpg"
         }
      },
      "description":"Nature will always be calling. Heed the sound & return the call with our collection of tents & sleeping bags.",
      "featured":false,
      "schedule":{
         "start":"2014-12-11T00:00:00.000Z",
         "end":"2014-12-12T07:10:15.883Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8831",
      "title":"Clothing & Accessories Sale - Save Big ",
      "slug":"clothing-and-accessories-sale---save-big",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8831.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8831.jpg"
         }
      },
      "description":"For 48 Hours Only - Bump Anything to 70% off our Clothing and Accessories Collection, Use Code: 9AH-1-6Y8KH",
      "featured":false,
      "schedule":{
         "start":"2014-12-11T00:00:00.000Z",
         "end":"2014-12-12T07:00:29.883Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9017",
      "title":"Shop Running Essentials",
      "slug":"shop-running-essentials",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9017.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9017.jpg"
         }
      },
      "description":"Don't wait till the new year to start thinking about running & fitness, start kicking those holiday pounds right now with our collection of running shoes, tights, accessories, & more. ",
      "featured":false,
      "schedule":{
         "start":"2014-12-11T00:00:00.000Z",
         "end":"2014-12-12T07:00:27.883Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9045",
      "title":"Get Gifts For Your Surfer",
      "slug":"get-gifts-for-your-surfer",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9045.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9045.jpg"
         }
      },
      "description":"Find savings on surf gear for your favorite surfer.",
      "featured":false,
      "schedule":{
         "start":"2014-12-11T00:00:00.000Z",
         "end":"2014-12-12T06:56:19.883Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9005",
      "title":"Get Deals On Packs & Accessories",
      "slug":"get-deals-on-packs-and-accessories",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9005.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9005.jpg"
         }
      },
      "description":"Our camp collection has what it takes to satiate the gear hunger of the summer outdoor obsessive on your list. ",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T07:08:28.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8891",
      "title":"Score The Coolest Gifts",
      "slug":"score-the-coolest-gifts",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8891.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8891.jpg"
         }
      },
      "description":"With our collection of skis & snowboards, you can basically win the Holidays and save big at the same time. Win Win.",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T07:08:02.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9039",
      "title":"Deals On Snowboards, Boots, & Bindings ",
      "slug":"deals-on-snowboards-boots-and-bindings",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9039.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9039.jpg"
         }
      },
      "description":"Save big on all things snowboarding - boots, boards, & bindings - You'll find everything you need in this collection.",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T07:07:58.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9009",
      "title":"Score New Baselayers",
      "slug":"score-new-baselayers",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9009.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9009.jpg"
         }
      },
      "description":"Layer, Layer, Layer. Shop our selection of base layers, mid layers, & socks from our top brands.",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T07:01:42.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8889",
      "title":"Get The Hottest Gifts",
      "slug":"get-the-hottest-gifts",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8889.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8889.jpg"
         }
      },
      "description":"Kayaks, bikes, SUP, camp-our collection has what it takes to satiate the gear hunger of the summer outdoor obsessive on your list. ",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T07:00:58.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8991",
      "title":"Get the Best Deals on Fly Fishing Gear",
      "slug":"get-the-best-deals-on-fly-fishing-gear",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8991.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8991.jpg"
         }
      },
      "description":"The fish are still biting, and they're not going to hook themselves. Get all of the essential gear that you need in our latest collection.",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T06:59:01.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8973",
      "title":"Save On Icebreaker",
      "slug":"save-on-icebreaker",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8973.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8973.jpg"
         }
      },
      "description":"Get the temperature-regulating power and odor-blocking awesomeness of merino wool. And, thanks to this collection, you can get it for less than you'd pay for most synthetics. ",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T06:56:26.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9043",
      "title":"Gear Up For Ski Season",
      "slug":"gear-up-for-ski-season",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9043.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9043.jpg"
         }
      },
      "description":"With our collection of skis, you can basically win the Holidays and save big at the same time. Win Win.",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T06:56:01.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9027",
      "title":"Under $20 Bargain Bin",
      "slug":"under-20-bargain-bin",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9027.jpeg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9027.jpeg"
         }
      },
      "description":"Everything in this collection is under $20",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T06:54:58.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"9025",
      "title":"Under $10 Bargain Bin",
      "slug":"under-10-bargain-bin",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/9025.jpeg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/9025.jpeg"
         }
      },
      "description":"Everything in this collection is under $10.",
      "featured":false,
      "schedule":{
         "start":"2014-12-10T00:00:00.000Z",
         "end":"2014-12-11T06:53:24.642Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8987",
      "title":"Get Winter Accessories For Less",
      "slug":"get-winter-accessories-for-less",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8987.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8987.jpg"
         }
      },
      "description":"We've assembled all of the essential winter accessories into one collection. Start saving on warming pieces like gloves, beanies, ski socks, & more.",
      "featured":false,
      "schedule":{
         "start":"2014-12-08T00:00:00.000Z",
         "end":"2014-12-10T07:11:04.637Z"
      },
      "sites":[
         "steepandcheap"
      ]
   },
   {
      "id":"8993",
      "description":"Save big on all things Burton boots, boards, & more.",
      "featured":false,
      "schedule":{
         "start":"2014-12-08T00:00:00.000Z",
         "end":"2014-12-10T07:05:03.637Z"
      },
      "sites":[
         "steepandcheap"
      ],
      "title":"Save On Burton",
      "slug":"save-on-burton",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8993.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8993.jpg"
         }
      }
   },
   {
      "id":"899322",
      "description":"Save big on all things Burton boots, boards, & more.",
      "featured":false,
      "schedule":{
         "start":"2014-12-11T00:00:00.000Z",
         "end":"2014-12-11T07:05:03.637Z"
      },
      "sites":[
         "steepandcheap"
      ],
      "title":"TEST TEST",
      "slug":"save-on-burton",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8993.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8993.jpg"
         }
      }
   },
   {
      "id":"899322",
      "description":"Save big on all things Burton boots, boards, & more.",
      "featured":false,
      "schedule":{
         "start":"2014-12-12T00:00:00.000Z",
         "end":"2014-12-18T07:05:03.637Z"
      },
      "sites":[
         "steepandcheap"
      ],
      "title":"123456",
      "slug":"save-on-burton",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8993.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8993.jpg"
         }
      }
   },
   {
      "id":"899322",
      "description":"Save big on all things Burton boots, boards, & more.",
      "featured":false,
      "schedule":{
         "start":"2014-12-14T00:00:00.000Z",
         "end":"2014-12-15T07:05:03.637Z"
      },
      "sites":[
         "steepandcheap"
      ],
      "title":"BOOM",
      "slug":"save-on-burton",
      "image":{
         "url":{
            "square":"http://www.steepandcheap.com/images/collections/small/8993.jpg",
            "rectangle":"http://www.steepandcheap.com/images/collections/620x250/8993.jpg"
         }
      }
   }
];
}