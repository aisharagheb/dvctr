angular.module('orderCloud.console', [])
    .config( ApiConsoleConfig )
    .controller('ApiConsoleParamsCtrl', ApiConsoleParamsController)
    .directive('parameterInputs', ApiConsoleParams)
    .factory('apiConsoleFactory', ApiConsoleFactory)
    .controller('ApiConsoleCtrl', ApiConsoleController);

function ApiConsoleConfig( $stateProvider, $urlMatcherFactoryProvider ) {
    $urlMatcherFactoryProvider.strictMode(false);
    $stateProvider.state('base.console', {
        'url': '/console',
        'templateUrl': 'tester/templates/tester.tpl.html',
        'controller': 'ApiConsoleCtrl',
        'controllerAs': 'apiConsoleController',
        'resolve': {
            apiConsoleServices: function (apiConsoleFactory) {
                return apiConsoleFactory.getAngularFactories('orderCloud.sdk');
            }
        },
        'data':{ pageTitle: 'API Console' }
    });
};

function ApiConsoleParamsController($scope, $templateCache, $compile) {
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
        angular.forEach(params, function(value, key) {
            var input = "";

            if (value.indexOf('ID') > -1 || value.substr(0, 2) == "is" || value === "search") {
                input = 'tester/templates/field/text.tpl.html';
            } else {
                input = 'tester/templates/field/object.tpl.html';
            }

            var template = vm.TemplateCacheSvc_.get(input);
            template =
                template.replace(/tmpValue/gi, value)
                    .replace(/propertyName/gi, value)
                    .replace(/counter-value/gi, counter++);

            // Initialize Resolved Parameters to null
            if (angular.isDefined(scope.apiConsoleController.selectedMethod) &&
                scope.apiConsoleController.selectedMethod.resolvedParameters) {
                if (isNaN(value)) {
                    scope.apiConsoleController.selectedMethod.resolvedParameters[value] = null;
                }
            }

            element.append(template);
        });

        vm.CompileSvc_(element.contents())($scope);
    }
};

function ApiConsoleParams() {
    var directiveWorker = {
        restrict: 'E/',
        template: '<section id="divId"></section>',
        controller: 'ApiConsoleParamsCtrl',
        controllerAs: 'apiConsoleDirectiveCtrl',
        link: _link
    };

    return directiveWorker;

    function _link(scope, element, attrs) {
        scope.$watch(function () {
            return scope.apiConsoleController.selectedMethod;
        }, function (newValue, oldValue) {
            var method = newValue;

            if (method) {
                if (method != oldValue) {
                    if (angular.isDefined(newValue.params)) {
                        method.callerStatement = null;
                        method.results = null;
                        method.resolvedParameters = {};

                        scope.apiConsoleDirectiveCtrl.createParameters(
                            method.params, element, scope);
                        method.callerStatement =
                            scope.apiConsoleController.ApiConsoleSvc_.getJavaScriptCommand(
                                scope.apiConsoleController.selectedService, method,
                                scope.apiConsoleController.ApiConsoleSvc_.getParameterString(
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
        getJavaScriptCommand: _buildJavascriptCommand,
        getParameterString: _getParametersList
    };

    // Custom Behaviors
    function _cleanUp(parameters) {
        var returnValue = parameters.join(",");
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
        if (valueToConvert === "null" || valueToConvert === "") {
            return null;
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
        var returnValue = "";

        if (angular.isDefined(resolvedParameters)) {
            angular.forEach(resolvedParameters, function (value, key) {
                if (isNaN(key)) {
                    if (value === "") {
                        value = "null";
                    }

                    parameter.push(value);
                }
            }, parameter);
        }

        if (parameter) {
            returnValue = _cleanUp(parameter);
        }

        return returnValue;
    };

    function _buildJavascriptCommand(service, method, parameters) {
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

        return service.name + '.' + method.name.toLowerCase() + parameters + ';';
    };

    function _executeFunction(service, method, scope) {
        var parameters = _getParametersList(method.resolvedParameters);

        if (!parameters) {
            parameters = 'null';
        }

        method.callerStatement = _buildJavascriptCommand(service, method, parameters);

        if (parameters.indexOf("{") != -1) {
            var jsonObject = JSON.parse(parameters);
            results = scope.apiConsoleController.InjectorSvc_.get(service.name)[method.name](jsonObject);
        } else if (parameters.indexOf(",") == -1) {
            parameters = _nullConverter(parameters.replace(/'/gi, ""));
            results = scope.apiConsoleController.InjectorSvc_.get(service.name)[method.name](parameters);
        } else {
            parameters = _nullConverter(parameters.split(","));
            results = scope.apiConsoleController.InjectorSvc_.get(service.name)[method.name].apply(this, parameters);
        }

        if (results) {
            results
                .then(scope.apiConsoleController.operations.successful)
                .catch(scope.apiConsoleController.operations.exceptions);
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
            if (component[1] == 'factory' && filterFactories.indexOf(componentName) == -1) {
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

function ApiConsoleController($scope, apiConsoleFactory, apiConsoleServices, $injector, $compile) {
    var vm = this;

    // Services
    vm.ApiConsoleSvc_ = apiConsoleFactory;
    vm.ScopeSvc_ = $scope;
    vm.CompileSvc_ = $compile;
    vm.InjectorSvc_ = $injector;
    vm.statementPromise = undefined;

    // Local Variables
    vm.services = apiConsoleServices;
    vm.selectedService = null;
    vm.selectedMethod = {
        callerStatement: null,
        results: null,
        params: [],
        resolvedParameters: {}
    };
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
            if (service != oldValue) {
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
            $scope);
    };

    vm.display = function (data, property) {
        if (data) {
            if (angular.isDefined(data[property])) {
                return data[property];
            }
        }

        return null;
    };
};