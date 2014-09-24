'use strict';

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-karma');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      client: {
        files: [
          {
            src: [
              'demo/scripts/app.js'
            ],
            dest: 'src/scheduler.js'
          }
        ]
      },
      vendor: {
        files: [
          {
            src: [
              'bower_components/angular/angular.min.js',
              'bower_components/angular-sanitize/angular-sanitize.min.js',
              'bower_components/underscore/underscore-min.js',
              'bower_components/jquery/dist/jquery.min.js',
              'bower_components/moment/min/moment.min.js',
              'bower_components/moment-range/lib/moment-range.js',
              'bower_components/ngQuickDate/dist/ng-quick-date.min.js'
            ],
            dest: 'demo/scripts/vendor.js'
          }
        ]
      }
    },
    compass: {
      prod: {
        options: {
          sassDir: 'demo/scss',
          cssDir: 'demo/',
          environment: 'production',
          javascriptsDir: 'demo/scripts',
          outputStyle: 'compressed',
          relativeAssets: true,
          raw: 'preferred_syntax = :scss\nasset_cache_buster :none\n'
        }
      }
    },
    jshint: {
      options: {
        'maxlen'        : 100,
        'maxerr'        : 50,
        'curly'         : true,
        'eqeqeq'        : true,
        'forin'         : true,
        'indent'        : 2,
        'newcap'        : true,
        'noarg'         : true,
        'noempty'       : true,
        'undef'         : true,
        'unused'        : true,
        'strict'        : true,
        'trailing'      : true,
        'globalstrict'  : true,
        'laxcomma'      : true,
        'node'          : true,
        'sub'           : true,
        'validthis'     : false,
        'expr'          : true,
        'esnext'        : true
      }
    },
    karma: {
      unit: {
        configFile: 'test/test.conf.js'
      },
      local: {
        configFile: 'test/test.conf.js',
        singleRun: false,
        autoWatch: true
      },
      dots: {
        configFile: 'test/test.conf.js',
        singleRun: false,
        autoWatch: true,
        reporters: ['dots', 'coverage']
      }
    },
    watch: {
      client: {
        files: ['demo/scripts/app.js'],
        tasks: ['concat'],
        options: {
          livereload: true
        }
      },
      compass: {
        files: ['demo/scss/**/**.scss'],
        tasks: ['compass'],
        options: {
          livereload: true
        }
      },
      views: {
        files: ['demo/index.html'],
        options: {
          livereload: true
        }
      }
    }
  });

  // Default task. Run with `grunt`.
  grunt.registerTask('default', function () {
    process.env.NODE_ENV = 'test';
    grunt.task.run(
      'jshint',
      'compass',
      'concat'
    );
  });
};