angular.module( 'orderCloud.base', [
	'ui.router'
])

	.config(BaseConfig)
	.controller( 'BaseCtrl', BaseController)

;

function BaseConfig( $stateProvider ) {
	$stateProvider.state( 'base', {
		abstract: true,
		url: '',
		resolve: {
			isAuthenticated: function( Auth, $state ) {
				return Auth.IsAuthenticated().catch( function() {
						$state.go( 'login' );
					}
				);
			}
		},
		views: {
			'': {
				templateUrl: 'base/templates/base.tpl.html',
				controller: 'BaseCtrl',
				controllerAs: 'base'
			},
			'top@base': {
				templateUrl: 'base/templates/base.top.tpl.html'
			},
			'left@base': {
				templateUrl: 'base/templates/base.left.tpl.html'
			},
			'right@base': {
				templateUrl: 'base/templates/base.right.tpl.html'
			},
			'bottom@base': {
				templateUrl: 'base/templates/base.bottom.tpl.html'
			}
		}
	});
}

function BaseController( $state, Users ) {
	var vm = this;
	vm.swiped = 'none';
	vm.setSwipe = function( direction ) {
		vm.swiped = direction;
	};
	vm.logout = function() {
		Users.Logout();
		$state.go( 'login' );
	};
}
