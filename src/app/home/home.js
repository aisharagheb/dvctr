angular.module( 'orderCloud.home', [
	'ui.router'
])

	.config( HomeConfig )
	.controller( 'HomeCtrl', HomeController )

;

function HomeConfig( $stateProvider, $urlMatcherFactoryProvider ) {
	$urlMatcherFactoryProvider.strictMode(false);
	$stateProvider.state( 'base.home', {
		url: '/home',
		templateUrl:'home/templates/home.tpl.html',
		controller:'HomeCtrl',
		data:{ pageTitle: 'Home' }
	});
}

function HomeController( $scope ) { }
