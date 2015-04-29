angular.module( 'orderCloud' )

	.config( HomeConfig )
	.controller( 'HomeCtrl', HomeController )

;

function HomeConfig( $stateProvider ) {
	$stateProvider.state( 'home', {
		url: '/home',
		templateUrl:'home/templates/home.tpl.html',
		controller:'HomeCtrl',
		controllerAs: 'home',
		data:{ pageTitle: 'Home' }
	});
}

function HomeController( ) {
	var vm = this;
	vm.example = 'Example Data';
}
