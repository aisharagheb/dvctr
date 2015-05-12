angular.module('orderCloud.console', [])
    .config( ApiConsoleConfig )
    .factory('ApiLoader', ApiLoaderService)
    .controller('ApiConsoleCtrl', ApiConsoleController);

function ApiConsoleConfig( $stateProvider, $urlMatcherFactoryProvider ) {
    $urlMatcherFactoryProvider.strictMode(false);
    $stateProvider.state('base.console', {
        'url': '/console',
        'templateUrl': 'console/templates/console.tpl.html',
        'controller': 'ApiConsoleCtrl',
        'controllerAs': 'console',
        'resolve': {
            ApiConsoleServices: function (ApiLoader) {
                return ApiLoader.getServices('orderCloud.sdk');
            }
        },
        'data':{ pageTitle: 'API Console' }
    });
};

function ApiConsoleController($scope, $resource, $injector, apiurl, ApiConsoleServices) {
	var vm = this;
	vm.Services = ApiConsoleServices;
	vm.SelectedService = "";
	vm.SelectedMethod = "";
	vm.SelectedEndpoint = null;
	vm.Response = null;

	vm.ValidateParamObject = function(param) {
		try {
			$scope.ApiConsole[param.Name].$setValidity('ObjectParam', validateModel(param.Value));
		} catch(ex) {
			$scope.ApiConsole[param.Name].$setValidity('ObjectParam', false);
		}

		function validateModel(value) {
			var obj = JSON.parse(value.replace(/\n/g, ''));
			var fieldErrors = 0;
			angular.forEach(vm.SelectedEndpoint.RequestBody.Fields, function(field) {
				angular.forEach(obj, function(value, key) {
					if (key == field.Name && field.Required) {
						switch (field.Type) {
							case('string'):
								if (!angular.isString(value) || !value.length) fieldErrors++;
								break;
							case('boolean'):
								if (typeof(value) != 'boolean') fieldErrors++;
								break;
							case('object'):
								if (!angular.isObject(value)) fieldErrors++;
								break;
							case('integer'):
								if (!angular.isNumber(value)) fieldErrors++;
						}
					}
				})
			});
			return fieldErrors == 0;
		}
	};

	vm.Execute = function() {
		var params = [];
		angular.forEach(vm.SelectedMethod.resolvedParameters, function(p) {
			params.push(p.Type == 'object' ? JSON.parse(p.Value) : p.Value);
		});
		$injector.get(vm.SelectedService.name)[vm.SelectedMethod.name].apply(this, params)
			.then( function(data) {
				vm.Response = data;
			})
			.catch( function(ex) {
				vm.Response = ex.data;
			});
	};

	$scope.$watch(function () {
		return vm.SelectedService;
	}, function (n, o) {
		if (!n || n === o) return;
		vm.Response = null;
		vm.SelectedMethod = '';
	});

	$scope.$watch(function () {
		return vm.SelectedMethod;
	}, function (n, o) {
		if (!n || n == '' || n === o) return;
		vm.Response = null;
		if (angular.isDefined(n.params)) createParameters(n.params);
	});

	function createParameters(params) {
		vm.SelectedMethod.resolvedParameters = [];
		$resource( apiurl + '/docs/' + vm.SelectedService.name + '/' + vm.SelectedMethod.name).get().$promise
			.then( function(data) {
				vm.SelectedEndpoint = data;
				analyzeParamters(vm.SelectedEndpoint);
			});

		function analyzeParamters(endpoint) {
			angular.forEach(params, function(methodParameter) {
				var isText = false;
				var isRequired = true;
				angular.forEach(endpoint.Parameters, function(parameter) {
					if (parameter.Name == methodParameter) {
						isText = true;
						isRequired = parameter.Required;
					}
				});

				function setValue() {
					if (isText) {
						return null;
					} else {
						return endpoint.RequestBody ? endpoint.RequestBody.Sample : null;
					}
				}

				var resolvedParameter = {
					Name: methodParameter,
					Type: isText ? 'text' : 'object',
					Value: setValue(),
					Required: isRequired
				};
				vm.SelectedMethod.resolvedParameters.push(resolvedParameter);
			});
		}
	}
}

function ApiLoaderService($q, $injector) {
	var service = {
		getServices: _getServices
	};

	return service;

	/////
	function _getParamNames (func) {
		var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
		var ARGUMENT_NAMES = /([^\s,]+)/g;
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

		if(result === null) result = [];

		return result;
	};

	function _getServices(moduleName) {
		var deferred = $q.defer();
		var filterFactories = [
			'Auth',
			'Request'
		];
		var services = [];

		angular.forEach(angular.module(moduleName)._invokeQueue, function(component) {
			var componentName = component[2][0];
			if (component[1] == 'factory' && filterFactories.indexOf(componentName) == -1 && componentName.indexOf('Extend') == -1) {
				var factory = {
					name: componentName,
					methods: []
				};
				var f =  $injector.get(factory.name);
				angular.forEach(f, function(value, key) {
					var method = {
						name: key,
						fn: value.toString(),
						resolvedParameters: {},
						callerStatement: null,
						results: null,
						params: _getParamNames(value)
					};
					factory.methods.push(method);
				});

				services.push(factory);
			}
		});
		deferred.resolve(services);

		return deferred.promise;
	};
}