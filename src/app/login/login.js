angular.module( 'orderCloud.login', [
	'ui.router'
])

	.config(LoginConfig)
	.controller( 'LoginCtrl', LoginController)

;

function LoginConfig( $stateProvider, $urlMatcherFactoryProvider ) {
	$urlMatcherFactoryProvider.strictMode(false);
	$stateProvider.state( 'login', {
		url: '/login',
		templateUrl: 'login/templates/login.tpl.html',
		controller: 'LoginCtrl',
		resolve: {
			isAuthenticated: function( Auth, $state ) {
				return Auth.isAuthenticated()
					.then( function() {
						$state.go('base.home');
					})
					.catch( function() {
						return true;
					})
			}
		},
		data:{ pageTitle: 'Login' }
	});
}

function LoginController( $scope, $state, User ) {
	$scope.login = function(creds) {
		User.login(creds).then(
			function() {
				$state.go('base.home');
			}).catch(function(ex) {
				console.dir(ex);
			});
	};
}
