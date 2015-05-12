angular.module('orderCloud.console', [])
    .config( ApiConsoleConfig )
    .controller('ApiConsoleParamsCtrl', ApiConsoleParamsController)
    .directive('parameterInputs', ApiConsoleParams)
    .factory('ApiConsoleFactory', ApiConsoleFactory)
    .controller('ApiConsoleCtrl', ApiConsoleController);

function ApiConsoleConfig( $stateProvider, $urlMatcherFactoryProvider ) {
    $urlMatcherFactoryProvider.strictMode(false);
    $stateProvider.state('base.console', {
        'url': '/console',
        'templateUrl': 'console/templates/console.tpl.html',
        'controller': 'ApiConsoleCtrl',
        'controllerAs': 'console',
        'resolve': {
            ApiConsoleServices: function (ApiConsoleFactory) {
                return ApiConsoleFactory.getAngularFactories('orderCloud.sdk');
            }
        },
        'data':{ pageTitle: 'API Console' }
    });
};

function ApiConsoleParamsController($scope, $templateCache, $compile, $resource, apiurl) {
    var vm = this;

    // Services
    vm.TemplateCacheSvc_ = $templateCache;
    vm.CompileSvc_ = $compile;

    // Custom Behaviors
    vm.createParameters = function (params, element, scope) {
        if (!params) {
            return;
        }

        $(element).empty();
        var counter = 1;
		if (scope.console.selectedMethod.name) {
			$resource( apiurl + '/docs/' + scope.console.selectedService.name + '/' + scope.console.selectedMethod.name).get().$promise
				.then( createForm );
		}

		function createForm(endpoint) {
			angular.forEach(params, function(value, key) {
				var inputText = false,
					input;

				angular.forEach(endpoint.Parameters, function(parameter) {
					if (parameter.Name == value) {
						inputText = true;
					}
				});

				if (inputText) {
					input = 'console/templates/field/text.tpl.html';
					scope.console.selectedMethod.resolvedParameters[value] = null;
				}
				else {
					input = 'console/templates/field/object.tpl.html';
					scope.console.selectedMethod.resolvedParameters[value] = endpoint.RequestBody ? endpoint.RequestBody.Sample : null;

				}

				var template = vm.TemplateCacheSvc_.get(input);
				template =
					template.replace(/tmpValue/gi, value)
						.replace(/propertyName/gi, value)
						.replace(/counter-value/gi, counter++);

				element.append(template);
			});

			vm.CompileSvc_(element.contents())($scope);
		}
    }
};

function ApiConsoleParams() {
    var directiveWorker = {
        restrict: 'E',
        template: '<section id="divId"></section>',
        controller: 'ApiConsoleParamsCtrl',
        controllerAs: 'apiConsoleDirectiveCtrl',
        link: _link
    };

    return directiveWorker;

    function _link(scope, element, attrs) {
        scope.$watch(function () {
            return scope.console.selectedMethod;
        }, function (newValue, oldValue) {
            var method = newValue;

            if (method) {
                if (method != oldValue) {
                    if (angular.isDefined(method.params)) {
                        method.callerStatement = null;
                        method.results = null;
                        method.resolvedParameters = {};

                        scope.apiConsoleDirectiveCtrl.createParameters(
                            method.params, element, scope);
                        method.callerStatement =
                            scope.console.ApiConsoleSvc_.getJavaScriptCommand(
                                scope.console.selectedService, method,
                                scope.console.ApiConsoleSvc_.getParameterString(
                                    method.resolvedParameters
                                ));
                    }
                }
            }
        });
    }
};

function ApiConsoleFactory($injector) {
    var factory = {
        getParameters: _getParamNames,
        executeFunction: _executeFunction,
        getAngularFactories: _getServices,
        getJavaScriptCommand: _buildJavaScriptCommand,
        getParameterString: _getParametersList
    };

    // Custom Behaviors
    function _cleanUp(parameters) {
        if (angular.isArray(parameters)) {
            var splitCharacter = ",";
            var returnValue = parameters.join(splitCharacter);
            var pattern = new RegExp(/,{2}/gi);

            /*
             This While loop replaces all occurrences of
             double commas (,,) with the string ",null,".
             i.e
             input: assignAddress takes 4 parameters.
             The parameters value will be as
             "'SteveCoCustomer1',,,true"
             1st Occurrence: "'SteveCoCustomer1',null,,true"
             2nd Occurrence: "'SteveCoCustomer1',null,null,true"
             */
            while(true) {
                if (pattern.test(returnValue)) {
                    returnValue = returnValue.replace(/,{2}/gi, ",null,");
                } else {
                    break;
                }
            }

            return _nullConverter(returnValue);
        } else {
            return _nullConverter(parameters);
        }
    };

    function _booleanConverter(booleanValue) {
        if (booleanValue === "false") {
            return false;
        } else if (booleanValue === "true") {
            return true;
        }

        return booleanValue;
    };

    function _convertToNull(valueToConvert) {
        if (angular.isObject(valueToConvert)) {
            return valueToConvert;
        }

        if (valueToConvert.indexOf("{") !== -1) {
            return valueToConvert;
        } else if (valueToConvert === "null" || valueToConvert === "") {
            return null;
        } else if (valueToConvert.indexOf("'") > -1 && valueToConvert.indexOf("{") === -1){
            return valueToConvert.replace(/'/gi, "");
        }

        return valueToConvert;
    };

    function _nullConverter(value) {
        if (angular.isArray(value)) {
            angular.forEach(value, function(v, key) {
                value[key] = _booleanConverter(_convertToNull(v));
            });

            return value;
        } else {
            return _convertToNull(value);
        }
    };

    function _convertToJSON(value) {
        if (value) {
            if (value.substr(0, 1) == "{") {
                value = JSON.parse(value);
            }
        }

        return value;
    };

    function _getParamNames (func) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;
        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

        if(result === null) {
            result = [];
        }

        return result;
    };

    function _getParametersList(resolvedParameters) {
        var parameter = [];

        if (angular.isDefined(resolvedParameters)) {
            angular.forEach(resolvedParameters, function (value, key) {
                if (isNaN(key)) {
                    if (value) {
                        if (value === "") {
                            value = "null";
                        }
                    }

                    parameter.push(value);
                }
            }, parameter);
        }

        return _cleanUp(parameter);
    };

    function _buildJavaScriptCommand(service, method, parameters) {
        if (!service || (!method || !method.name)) {
            return null;
        }

        if (!parameters) {
            parameters = 'null';
        }

        parameters = '(' + parameters + ')';
        parameters = parameters
            .replace(/\(,{1}/gi, "(null,")
            .replace(/,\){1}/gi, ", null)")
            .replace(/\(,\)/gi, "(null,null)");

        return (service.name + '.' + method.name +  parameters + ';');
    };

    function _getParameterArray(parameters) {
        var paramsArray = [];
        var callerSplitCharacter = ",";

        if (!parameters) {
            parameters = 'null';
        }

        if (parameters.indexOf(callerSplitCharacter) !== -1 && parameters.indexOf("{") === -1) {
            // Convert JSON String to Objects
            angular.forEach(parameters.split(callerSplitCharacter), function (value, key) {
                paramsArray.push(_convertToJSON(value));
            }, paramsArray);
        } else if (parameters.indexOf(callerSplitCharacter) !== -1 && parameters.indexOf("{") !== -1) {
            angular.forEach(parameters.split(callerSplitCharacter + "{"), function (value, key) {
                if (value.substr(value.length - 1, 1) == "}" && value.substr(0, 1) != "{") {
                    value = "{" + value;
                }

                paramsArray.push(_convertToJSON(value));
            }, paramsArray);
        } else {
            paramsArray = new Array(_convertToJSON(parameters));
        }

        return paramsArray;
    };

    function _executeFunction(service, method, scope) {
        var paramsArray =
            _nullConverter(_getParameterArray(
                _getParametersList(method.resolvedParameters)));

        results = scope.console.InjectorSvc_.get(service.name)[method.name].apply(this, paramsArray);

        if (results) {
            results
                .then(scope.console.operations.successful)
                .catch(scope.console.operations.exceptions);
        }
    };

    function _getServices(moduleName) {
        var filterFactories = [
            'Auth',
            'Request'
        ];
        var svc = this;
        svc.services = [];

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

                svc.services.push(factory);
            }
        });

        return svc.services;
    };

    return factory;
};

function ApiConsoleController($scope, $resource, $injector, $compile, $sce, apiurl, ApiConsoleFactory, ApiConsoleServices) {
    var vm = this;

    // Services
    vm.ApiConsoleSvc_ = ApiConsoleFactory;
    vm.ScopeSvc_ = $scope;
    vm.CompileSvc_ = $compile;
    vm.InjectorSvc_ = $injector;
    vm.SanitizerSvc_ = $sce;
    vm.statementPromise = undefined;

    // Local Variables
    vm.services = ApiConsoleServices;
    vm.selectedService = null;
    vm.selectedMethod = {
        callerStatement: null,
        results: null,
        params: [],
        resolvedParameters: {}
    };
    vm.documentUrl = "#";
    vm.operations = {
        successful: function (data) {
            vm.selectedMethod.results = data;
        },
        exceptions: function(err) {
            if (angular.isDefined(err.data) && err.data) {
                if (angular.isDefined(err.data.Message)) {
                    vm.selectedMethod.results = err.data.Message;
                } else {
                    vm.selectedMethod.results = err.data;
                }
            } else {
                vm.selectedMethod.results = err;
            }
        }
    };

    // Watches
    vm.ScopeSvc_.$watch(function () {
        return vm.selectedService
    }, function (newValue, oldValue) {
        var service = newValue;
        if (service) {
            vm.documentation = $resource(apiurl + '/docs/' + service.name).get();
            if (service != oldValue) {
                vm.setDocumentUri(service.name);
                vm.selectedMethod = {
                    callerStatement: null,
                    results: null,
                    params: [],
                    resolvedParameters: {}
                };
            }
        }
    });
    vm.ScopeSvc_.$watchCollection(function () {
        return vm.selectedMethod.resolvedParameters;
    }, function (newValue, oldValue) {
        var resolvedParameters = newValue;

        if (resolvedParameters) {
            vm.selectedMethod.callerStatement =
                vm.ApiConsoleSvc_.getJavaScriptCommand(
                    vm.selectedService, vm.selectedMethod,
                    vm.ApiConsoleSvc_.getParameterString(
                        resolvedParameters
                    ));
        }
    });

    // Custom Behaviors
    vm.callMethod = function() {
        vm.ApiConsoleSvc_.executeFunction(
            vm.selectedService,
            vm.selectedMethod,
            vm.ScopeSvc_);
    };

    vm.display = function (data, property) {
        if (data) {
            if (angular.isDefined(data[property])) {
                return data[property];
            }
        }

        return null;
    };

    vm.setDocumentUri = function (serviceName) {
        if (serviceName) {
            var baseUri = "http://four51.github.io/aveda-docs/reference/#/" + serviceName.toLowerCase();
            vm.documentUrl = vm.SanitizerSvc_.trustAsResourceUrl(
                ((serviceName === "Address") ? baseUri + "es" : baseUri + "s"));
        } else {
            vm.documentUrl =  vm.SanitizerSvc_.trustAsResourceUrl("#");
        }
    };

    vm.typeof = function(value) {
        return typeof(value);
    };
};