angular.module('angularScheduler', ['ngSanitize'])
  .controller('schedulerCtrl', schedulerCtrl)
  .directive('scheduler', scheduler)
  .controller('dummyData', dummyData);

function schedulerCtrl ($q, $scope, $rootScope, $timeout) {
  $scope.$on('data-received', function(event, testData){
    var testing = testData;
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
            '<div ng-repeat="day in daysList" class="block" ng-class="{\'current-day\': day.name === now, \'first-block\': $first, \'last-block\': $last}">',
              '<h3 class="block-heading">{{day.name}}</h3>',
              '{{day.id}}',
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
            $('.outter-block-wrap').scrollLeft(currentDayPos - 20);
          });
        }, 0);
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
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-13T05:56:13.927Z"
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
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-13T06:02:10.927Z"
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
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-14T06:01:11.159Z"
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
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-14T06:08:36.159Z"
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
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-15T05:54:47.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7371",
      "title": "Accessories Sale",
      "slug": "accessories-sale",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7371.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7371.jpg"
        }
      },
      "description": "Everything in this collection is about the details because details matter.",
      "featured": false,
      "schedule": {
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-15T05:57:23.159Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
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
        "start": "2014-08-13T00:00:00.000Z",
        "end": "2014-08-16T06:07:14.159Z"
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
        "start": "2014-09-26T00:00:00.000Z",
        "end": "2014-09-27T06:11:17.306Z"
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
        "start": "2014-09-26T00:00:00.000Z",
        "end": "2014-09-28T06:00:17.306Z"
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
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-28T06:05:59.852Z"
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
        "start": "2014-09-25T00:00:00.000Z",
        "end": "2014-09-28T06:14:41.852Z"
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
        "start": "2014-09-26T00:00:00.000Z",
        "end": "2014-09-29T05:59:57.306Z"
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
        "start": "2014-09-26T00:00:00.000Z",
        "end": "2014-09-29T06:05:33.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    },
    {
      "id": "7989",
      "title": "Men's Tops",
      "slug": "mens-tops",
      "image": {
        "url": {
          "square": "http://www.steepandcheap.com/images/collections/small/7989.jpg",
          "rectangle": "http://www.steepandcheap.com/images/collections/620x250/7989.jpg"
        }
      },
      "description": "Tops are easy to come by, but it's not always easy to find them at a great price. Refresh your look by grabbing a shirt or top for work or play.",
      "featured": false,
      "schedule": {
        "start": "2014-11-20T00:00:00.000Z",
        "end": "2014-11-22T06:07:33.306Z"
      },
      "sites": [
        "steepandcheap"
      ]
    }
  ];
}