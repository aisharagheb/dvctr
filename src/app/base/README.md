# The `src/app/base` Directory

## Overview

```
src/
  |- app/
  |  |- base/
  |  |  |- base.js
  |  |  |- base.less
  |  |  |- base.spec.js
  |  |  |- base.tpl.html
```

- `base.js` - defines the module.
- `base.less` - module-specific styles; this file is imported into
  `src/less/main.less` manually by the developer.
- `base.spec.js` - module unit tests.
- `base.tpl.html` - the route template.

## `base.js`

This boilerplate is too simple to demonstrate it, but `src/app/base` could have
several sub-folders representing additional modules that would then be listed
as dependencies of this one.  For example, a `note` section could have the
submodules `note.create`, `note.delete`, `note.search`, etc.

Regardless, so long as dependencies are managed correctly, the build process
will automatically take take of the rest.

The dependencies block is also where component dependencies should be
specified, as shown below.

```js
angular.module( 'ngBoilerplate.base', [
  'ui.router',
  'titleService',
  'plusOne'
])
```

Each section or module of the site can also have its own routes. AngularJS will
handle ensuring they are all available at run-time, but splitting it this way
makes each module more self-contained. We use [ui-router](https://github.com/angular-ui/ui-router) to create
a state for our 'base' page. We set the url we'd like to see in the address bar
as well as the controller and template file to load. Specifying "main" as our view
means the controller and template will be loaded into the <div ui-view="main"/> element
of the root template (aka index.html). Read more over at the [ui-router wiki](https://github.com/angular-ui/ui-router/wiki).
Finally we add a custom data property, pageTitle, which will be used to set the page's
title (see the app.js controller).

```js
.config(function config( $stateProvider ) {
  $stateProvider.state( 'base', {
    url: '/base',
    views: {
      "main": {
        controller: 'BaseCtrl',
        templateUrl: 'base/base.tpl.html'
      }
    },
    data:{ pageTitle: 'Base' }
  });
})
```

And of course we define a controller for our route, though in this case it does
nothing.

```js
.controller( 'BaseCtrl', function BaseController( $scope ) {
})
```
