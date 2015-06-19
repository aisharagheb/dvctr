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
		controllerAs: 'login',
		resolve: {
			isAuthenticated: function( Auth, $state ) {
				return Auth.IsAuthenticated()
					.then( function() {
						$state.go( 'base.home' );
					})
					.catch( function() {
						return true;
					})
			}
		},
		data:{ pageTitle: 'Login' }
	});
}

function LoginController( $state, Credentials ) {
	var vm = this;
	vm.submit = function( creds ) {
		Credentials.Get( creds ).then(
			function() {
				$state.go( 'base.home' );
			}).catch(function( ex ) {
				console.dir( ex );
			});
	};
}
