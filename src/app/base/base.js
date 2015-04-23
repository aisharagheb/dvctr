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
				return Auth.isAuthenticated().catch( function() {
						$state.go('login');
					}
				);
			}
		},
		views: {
			'': {
				templateUrl: 'base/templates/base.tpl.html',
				controller: 'BaseCtrl'
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

function BaseController( $scope, $state, User ) {
	$scope.swiped = 'none';
	$scope.setSwipe = function(direction) {
		$scope.swiped = direction;
	};
	$scope.logout = function() {
		User.logout();
		$state.go('login');
	};
}
