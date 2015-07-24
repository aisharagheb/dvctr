angular.module( 'orderCloud', [
	'templates-app',
	'ngSanitize',
	'ngAnimate',
	'ngMaterial',
	'ngMessages',
	'ngTouch',
	'ui.router',
	'markdown',
	'orderCloud.sdk',
	'orderCloud.base',
	'orderCloud.login',
	'orderCloud.console'
])

	//Test
	.constant('authurl', 'https://testauth.ordercloud.io/oauth/token')
	.constant('apiurl', 'https://testapi.ordercloud.io/v1')
	.constant('clientid', '262bbdce-888c-4425-9083-a9844ace838b')

	//.constant('authurl', 'http://core.four51.com:11629/OAuth/token')
	//.constant('apiurl', 'http://core.four51.com:9002')
	//.constant('clientid', 'F027D697-7945-4DE4-AB86-39441923902C')

	.constant('ocscope', 'FullAccess')
	.constant('appname', 'oc')
	.config( Routing )
	.config( ErrorHandling )
	.controller( 'AppCtrl', AppCtrl );

function AppCtrl( $scope ) {
	var vm = this;
	$scope.$on('$stateChangeSuccess', function( event, toState, toParams, fromState, fromParams ){
		if ( angular.isDefined( toState.data.pageTitle ) ) {
			vm.pageTitle = 'OrderCloud | ' + toState.data.pageTitle;
		}
	});
}

function Routing( $urlRouterProvider, $urlMatcherFactoryProvider ) {
	$urlMatcherFactoryProvider.strictMode(false);
	$urlRouterProvider.otherwise( '/home' );
	//$locationProvider.html5Mode(true);
	//TODO: For HTML5 mode to work we need to always return index.html as the entry point on the serverside
}

function ErrorHandling( $provide ) {
	$provide.decorator('$exceptionHandler', handler );

	function handler( $delegate, $injector ) {
		return function $broadcastingExceptionHandler( ex, cause ) {
			ex.status != 500 ?
				$delegate( ex, cause ) :
				( function() {
					try {
						//TODO: implement track js
						console.log(JSON.stringify( ex ));
						//trackJs.error("API: " + JSON.stringify(ex));
					}
					catch ( ex ) {
						console.log(JSON.stringify( ex ));
					}
				})();
			$injector.get( '$rootScope' ).$broadcast( 'exception', ex, cause );
		}
	}
}