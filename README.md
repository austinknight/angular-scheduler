# Angular Schedule Module

Still a work in progress.

## Requirements

- AngularJS
- jQuery
- Moment
- Moment-range

# Building

Install dependencies

    git must be on your path.  If you can't do 'git' from your terminal, then install git first and make sure you have access from the path.
    Bower installs are dependent on git.

    If you are a git noob, the easiest way to install is by installing the github client.

    # If you don't already have the grunt-cli installed:
    > npm install -g grunt-cli
    
    > npm install
    > grunt install

Default grunt task will build necesary files into src/
    > grunt

# Developing

"grunt watch" task. This will automatically rebuild js, and scss files which are put into /src. It will also watch for changes to html files for demo purposes. If you change Gruntfile.js, restart by using the default grunt task then watch again.
