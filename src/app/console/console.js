angular.module('orderCloud.console', [])
    .config( ApiConsoleConfig )
    .controller('ApiConsoleCtrl', ApiConsoleController)
	.factory('ApiLoader', ApiLoaderService)
	.factory('ApiConsoleService', ApiConsoleService)
	.directive('parameterObject', ParameterObjectDirective)
	.directive('emptyToNull', EmptyToNullDirective)
;

function ApiConsoleConfig( $stateProvider, $urlMatcherFactoryProvider ) {
    $urlMatcherFactoryProvider.strictMode(false);
    $stateProvider.state('base.console', {
        'url': '/console',
        'templateUrl': 'console/templates/console.tpl.html',
        'controller': 'ApiConsoleCtrl',
        'controllerAs': 'console',
        'resolve': {
			OrderCloudServices: function (ApiLoader) {
                return ApiLoader.getServices('orderCloud.sdk');
            }
        },
        'data':{ pageTitle: 'API Console' }
    });
};

function ApiConsoleController($scope, $resource, $injector, apiurl, OrderCloudServices, ApiConsoleService) {
	var vm = this;
	vm.Services = OrderCloudServices;
	vm.SelectedService = "";
	vm.SelectedMethod = "";
	vm.SelectedEndpoint = null;
	vm.Response = null;

	vm.Execute = function() {
		ApiConsoleService.ExecuteApi(vm.SelectedService, vm.SelectedMethod)
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
		vm.SelectedService.Documentation = $resource( apiurl + '/docs/' + vm.SelectedService.name ).get();
		vm.Response = null;
		vm.SelectedEndpoint = null;
		vm.SelectedMethod = '';
	});

	$scope.$watch(function () {
		return vm.SelectedMethod;
	}, function (n, o) {
		if (!n || n == '' || n === o) return;
		vm.Response = null;
		vm.SelectedEndpoint = null;
		if (angular.isDefined(n.params)) {
			ApiConsoleService.CreateParameters(vm.SelectedService, n)
				.then(function(data) {
					vm.SelectedEndpoint = data.SelectedEndpoint;
					vm.SelectedMethod.resolvedParameters = data.ResolvedParameters;
				});
		}
	});
}

function ApiConsoleService($injector, $resource, apiurl) {
	var service = {
		ExecuteApi: _executeApi,
		CreateParameters: _createParameters
	};

	return service;

	/////
	function _executeApi(SelectedService, SelectedMethod) {
		var params = [];
		angular.forEach(SelectedMethod.resolvedParameters, function(p) {
			params.push(p.Type == 'object' ? JSON.parse(p.Value) : p.Value);
		});
		return $injector.get(SelectedService.name)[SelectedMethod.name].apply(this, params);
	}

	function _createParameters(SelectedService, SelectedMethod) {
		var result = {
			SelectedEndpoint: null,
			ResolvedParameters: []
		};
		return $resource( apiurl + '/docs/' + SelectedService.name + '/' + SelectedMethod.name).get().$promise
			.then( function(data) {
				result.SelectedEndpoint = data;
				analyzeParamters(data);
				return result;
			});

		function analyzeParamters(endpoint) {
			angular.forEach(SelectedMethod.params, function(methodParameter) {
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
				result.ResolvedParameters.push(resolvedParameter);
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
				var f;
				try {
					f =  $injector.get(factory.name);
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
				}
				catch (ex) {}

				services.push(factory);
			}
		});
		deferred.resolve(services);

		return deferred.promise;
	};
}

function ParameterObjectDirective() {
	var obj = {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ctrl) {
			ctrl.$validators.parameterObject = function(modelValue, viewValue) {
				if (ctrl.$isEmpty(modelValue)) return true;
				try {
					return validateModel(viewValue);
				} catch(ex) {
					return false;
				}
				function validateModel(value) {
					var obj = JSON.parse(value.replace(/\n/g, ''));
					var fieldErrors = 0;
					angular.forEach(scope.console.SelectedEndpoint.RequestBody.Fields, function(field) {
						//TODO: make empty objects and objects that are straight up missing required fields entirely invalid
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
			}
		}
	};
	return obj;
}

function EmptyToNullDirective() {
	var directive = {
		restrict: 'A',
		require: 'ngModel',
		link: function (scope, elem, attrs, ctrl) {
			ctrl.$parsers.push(function(viewValue) {
				if(viewValue === "") {
					return null;
				}
				return viewValue;
			});
		}
	};

	return directive;
}