# Angular Schedule Module

Still a work in progress.

## Requirements

- AngularJS
- jQuery
- Moment
- Moment-range

#Usage

TBD

# Developing

  Using bower and npm for dependency management. Run the demo on any local server to use livereload or drop the index.html file into a browser if not.

    > git clone git@github.com:austinknight/angular-scheduler.git
    > npm install
    > bower install

    Default grunt task will build necesary files into src/
    > grunt

    Task to watch js and scss files in /demo that will get built into src. Also watches for changes to html files and reloads the page on save. If you change Gruntfile.js, restart by using the default grunt task then watch again.
    > grunt watch

##To Do
- Set up template for schedule inside of directive
- Set up css to send with the bower package
- Refactor a bunch of messy code
- Tests
- Figure out roadmap and new features

##Testing

TBD

##PR's

Always welcome. Make sure there are tests on whatever features are created.