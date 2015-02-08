'use strict';

// TODO(mkhatib): Seperate these into config/routes.js and
// config/interceptors/httpInterceptors.js and add tests for them.
// TODO(mkhatib): Move the autogenerated appConfig.js to config/constants.js.

angular.module('webClientApp', [
  'ngAnimate',
  'ngCookies',
  'ngLocale',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'AppConfig',
  'truncate',
  'snap',
  'angulartics',
  'angulartics.google.analytics',
  'angularFileUpload',
  'angular-loading-bar',
  'ipCookie',
  'ng-token-auth'
])
  /**
   * Routing.
   */
  .config(['$routeProvider',
      function ($routeProvider) {

    /**
     * Checks proper access to the route and reject it if unauthenticated.
     */
    var checkAccess = {
      load: ['$q', '$location', '$rootScope', '$auth', '$route', 'LoginService',
          function($q, $location, $rootScope, $auth, $route, LoginService) {
        var isPublic = $route.current.isPublic;
        var isAdmin = $route.current.isAdmin;
        var deferred = $q.defer();
        var callback = function() {
          if(LoginService.isAuthorized(isPublic, isAdmin)) {
            deferred.resolve();
          } else {
            deferred.reject();
            $rootScope.$broadcast('showLoginDialog', {
              'prev': $location.path()
            });
          }
        };
        $auth.validateUser().then(callback, callback);
        return deferred.promise;
      }]
    };


    $routeProvider

      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        title: 'منصة النشر العربية',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl',
        title: 'تسجيل الدخول',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/signup', {
        templateUrl: 'views/signup.html',
        controller: 'SignupCtrl',
        title: 'مستخدم جديد',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/articles/new', {
        templateUrl: 'views/articles/edit.html',
        controller: 'NewArticleCtrl',
        title: 'مقال جديد',
        isPublic: false,
        resolve: checkAccess
      })

      .when('/articles/:articleId/edit', {
        templateUrl: 'views/articles/edit.html',
        controller: 'EditArticleCtrl',
        isPublic: false,
        resolve: checkAccess
      })

      .when('/articles/:articleId', {
        templateUrl: 'views/articles/show.html',
        controller: 'ArticleCtrl',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/accounts/reset_password', {
        templateUrl: 'views/accounts/reset_password.html',
        controller: 'ResetPasswordController',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/accounts/update_password', {
        templateUrl: 'views/accounts/update_password.html',
        controller: 'UpdatePasswordController',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/profiles/:userId', {
        templateUrl: 'views/profiles/show.html',
        controller: 'ProfileCtrl',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/profiles/:userId/edit', {
        templateUrl: 'views/profiles/edit.html',
        controller: 'EditProfileCtrl',
        isPublic: false,
        resolve: checkAccess
      })

      .when('/categories/:categoryId', {
        templateUrl: 'views/categories/show.html',
        controller: 'CategoryCtrl',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/categories/:categoryId/topics/:topicId', {
        templateUrl: 'views/topics/show.html',
        controller: 'TopicCtrl',
        isPublic: true,
        resolve: checkAccess
      })

      .when('/admin', {
        templateUrl: 'views/admin/dashboard.html',
        isPublic: false,
        isAdmin: true,
        resolve: checkAccess
      })

      .when('/admin/manage/categories', {
        templateUrl: 'views/admin/manage/categories.html',
        controller: 'ManageCategoriesCtrl',
        isPublic: false,
        isAdmin: true,
        resolve: checkAccess
      })

      .otherwise({
        redirectTo: '/'
      });
  }])
  .factory('unAuthenticatedInterceptor', ['$location', '$q', '$rootScope',
      function ($location, $q, $rootScope) {
    return {
      'request': function(config) {
        return config;
      },

      'requestError': function(response) {
        console.error(response);
      },

      'response': function(response) {
        return response;
      },

      'responseError': function(response) {
        if (response.status === 401) {
          var previous = $location.path();
          $rootScope.$broadcast('showLoginDialog', {'prev': previous});
          return $q.reject(response);
        }
        else {
          return $q.reject(response);
        }
      }
    };
  }])

  /**
   * Sets up authentication for ng-token-auth.
   */
  .config(['$authProvider', 'API_HOST', function($authProvider, API_HOST) {
    $authProvider.configure({
      apiUrl: '//' + API_HOST,
      confirmationSuccessUrl:  'http://' + window.location.host + '/login',
      passwordResetSuccessUrl: ('http://' + window.location.host +
                                '/accounts/update_password'),
      authProviderPaths: {
        facebook: '/auth/facebook',
        gplus:   '/auth/gplus'
      },
    });
  }])

  /**
   * Intercept every http request and check for 401 Unauthorized
   * error. Clear the current user and redirect to /login page.
   */
  .config(['$httpProvider', '$locationProvider', function ($httpProvider, $locationProvider) {
    $httpProvider.interceptors.push('unAuthenticatedInterceptor');

    $locationProvider.html5Mode(true).hashPrefix('!');
  }])
  /**
   * Allow embedding specific sites.
   */
  .config(['$sceDelegateProvider', function ($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      // Allow loading from YouTube domain.
      'http://www.youtube.com/embed/**',
      'https://www.youtube.com/embed/**'
    ]);
  }])
  /**
   * Disable the spinner for angular-loading-bar.
   */
  .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
  }])
  /**
   * Everytime the route change check if the user need to login.
   */
  .run(['$location', '$rootScope', '$analytics', '$auth', 'LoginService', 'User', 'GA_TRACKING_ID',
      function ($location, $rootScope, $analytics, $auth, LoginService, User, GA_TRACKING_ID) {

    // ga is the Google analytics global variable.
    if (window.ga) {
      ga('create', GA_TRACKING_ID);
    }

    $rootScope.linkPrefix = 'http://' + document.location.host;

    /**
     * Holds data about page-wide attributes. Like pages title.
     */
    $rootScope.page = {
      title: 'منصة النشر العربية',
      description: 'منصة نشر متخصصة باللغة العربية مفتوحة المصدر',
      image: 'http://' + document.location.host + '/images/manshar@200x200.png'
    };

    /**
     * Logs the user out.
     */
    $rootScope.logout = function () {
      $analytics.eventTrack('Logout', {
        category: 'User'
      });
      LoginService.logout();
    };

    /**
     * Shows the login dialog.
     * @param {string} optPrev Optional previous path to go back to after login.
     */
    $rootScope.showLoginDialog = function(optPrev) {
      $rootScope.$broadcast('showLoginDialog', {
        'prev': optPrev
      });
    };

    /**
     * Returns true if the passed user is the same user that is referenced
     * in the resource. This assumes that the resource always have a user
     * property, otherwise it'll return false.
     * @param {Object} user The object representing the user data.
     * @param {Object} resource The object representing the resource (e.g. Article).
     * @returns {boolean} true if the user is the owner of the resource.
     */
    $rootScope.isOwner = function (user, resource) {
      var id = user && parseInt(user.id);
      return (!!user && !!resource && !!resource.user &&
              id === resource.user.id);
    };

    var checkAccess = function(event, next, current) {
      // Is user logged in?
      if(!LoginService.isAuthorized(next.isPublic, next.isAdmin)) {
        event.preventDefault();
        // Show the dialog instead of redirecting for all navigations.
        // Except first time landing on the site on protected page.
        if (current) {
          $rootScope.$broadcast('showLoginDialog', {
            'prev': next.$$route.originalPath
          });
        } else {
          var prev = next.$$route && next.$$route.originalPath;
          $location.path('/login').search('prev', prev);
        }
      }
    };

    /**
     * If the route to be accessed is private make sure the user is authenticated
     * otherwise, broadcast 'showLoginDialog' to show login modal.
     */
    $rootScope.$on('$routeChangeStart', function(event, next, current) {
      checkAccess(event, next, current);
    });

    $rootScope.$on('$routeChangeSuccess', function (event, current) {
      $rootScope.page.title = current.$$route.title || $rootScope.page.title;
      $rootScope.page.url = document.location.href;
    });

    var getLoggedInUserProfile = function(event, data) {
      User.get({'userId': data.id}, function(user) {
        angular.extend($rootScope.user, user);
      });
    };

    $rootScope.$on('auth:validation-success', getLoggedInUserProfile);
    $rootScope.$on('auth:login-success', getLoggedInUserProfile);

  }]);
