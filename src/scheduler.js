angular.module('angularScheduler', ['ngQuickDate'])
  .service('SchedulerService', SchedulerService)
  .directive('scheduler', scheduler);

function SchedulerService ($http, $q) {
  var apiKey = '';

  $http.defaults.headers.common.Authorization = 'Basic ' + btoa(apiKey);

  function getData () {
    var deferred = $q.defer();
    //Dummy Data
    var data = {
      data: [
       {
          "id":"Zkfh4kYjb",
          "description":"Creative Content - general text/markdown/html/whatever",
          "featured":false,
          "schedule":{
             "start":null,
             "end":null
          },
          "sites":[
             "steepandcheap"
          ],
          "title":"Cool stuff",
          "slug":"cool-stuff"
       },
       {
          "id":"7351",
          "title":"Women's Apparel Sale",
          "slug":"womens-apparel-sale",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7351.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7351.jpg"
             }
          },
          "description":"Women's clothing on sale. This is your opportunity to look good without going broke.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-18T05:56:13.927Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7333",
          "title":"Men's Apparel Sale",
          "slug":"mens-apparel-sale",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7333.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7333.jpg"
             }
          },
          "description":"Men's clothing on sale. This is your opportunity to look good without going broke.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-18T06:02:10.927Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7339",
          "title":"Beanies &amp; Goggles",
          "slug":"beanies-and-goggles",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7339.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7339.jpg"
             }
          },
          "description":"It's in this collection if it goes on your head.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-19T06:01:11.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7337",
          "title":"Men's Jackets",
          "slug":"mens-jackets",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7337.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7337.jpg"
             }
          },
          "description":"Zip up, button up, and stay warm and dry. Grab a jacket for any season.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-19T06:08:36.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7375",
          "title":"Men's New Arrivals",
          "slug":"mens-new-arrivals",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7375.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7375.jpg"
             }
          },
          "description":"Fresh finds are lined up and ready for you. Get the good stuff and get if first with this\r\ncollection of brand new apparel for guys.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-20T05:54:47.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7371",
          "title":"Accessories Sale",
          "slug":"accessories-sale",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7371.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7371.jpg"
             }
          },
          "description":"Everything in this collection is about the details because details matter.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-20T05:57:23.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7377",
          "title":"Buyers' Picks For August",
          "slug":"buyers-picks-for-august",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7377.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7377.jpg"
             }
          },
          "description":"Our buyers dug deep into their list of favorites to create this collection.",
          "featured":false,
          "schedule":{
             "start":"2014-09-15T00:00:00.000Z",
             "end":"2014-09-17T06:07:14.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7373",
          "title":"Stoic",
          "slug":"stoic",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7373.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7373.jpg"
             }
          },
          "description":"Thrive in your element with clothing, camping gear, and outerwear from Stoic.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-19T06:09:41.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7381",
          "title":"Active Women",
          "slug":"active-women",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7381.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7381.jpg"
             }
          },
          "description":"If you feel good when you work out, youll and push yourself harder. Maybe it's the way quality activewear keeps you comfortable despite the sweat, or maybe it's just the instant confidence boost you get when you slide into a new gym outfit.",
          "featured":false,
          "schedule":{
             "start":"2014-09-16T00:00:00.000Z",
             "end":"2014-09-17T06:11:44.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"7419",
          "title":"Hoodies!",
          "slug":"hoodies",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7419.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7419.jpg"
             }
          },
          "description":"The right hoody never goes out of style. Plus, you'll always be warm and comfortable.",
          "featured":false,
          "schedule":{
             "start":"2014-09-18T00:00:00.000Z",
             "end":"2014-09-19T06:00:18.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       },
       {
          "id":"1234",
          "title":"Underwear!",
          "slug":"underwear",
          "image":{
             "url":{
                "square":"http://www.steepandcheap.com/images/collections/small/7419.jpg",
                "rectangle":"http://www.steepandcheap.com/images/collections/620x250/7419.jpg"
             }
          },
          "description":"The right hoody never goes out of style. Plus, you'll always be warm and comfortable.",
          "featured":false,
          "schedule":{
             "start":"2014-09-13T00:00:00.000Z",
             "end":"2014-09-20T06:00:18.159Z"
          },
          "sites":[
             "steepandcheap"
          ]
       }
    ]
    };

    deferred.resolve(data);
    return deferred.promise;
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

      var getBuckets = SchedulerService.getData().then(function(data){
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
              index = _.indexOf(null) === -1 ? now.length : _.indexOf(null);
              
              now[index] = item;
            } else {
              index = _.indexOf(now, item);

              if (index !== -1) {
                now[index] = item;
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
      _.each(daysList, function(day, index){
        var currentDate = day.id;
        getBuckets.then(function(schedule){
          _.each(schedule, function(bucket){
            if (bucket.date == currentDate) {
              _.each(bucket, function(item){
                
                day.items.push(item);  
                
              })
            }
          });
        });
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