angular.module('orderCloud.console', [])
    .config( TesterConfig )
    .controller('TesterParamsCtrl', TesterParamsController)
    .directive('testerParams', TesterParams)
    .factory('tester', TesterFactory)
    .controller('TesterCtrl', TesterController);

function TesterConfig( $stateProvider, $urlMatcherFactoryProvider ) {
    $urlMatcherFactoryProvider.strictMode(false);
    $stateProvider.state('base.tester', {
        'url': '/tester',
        'templateUrl': 'tester/templates/tester.tpl.html',
        'controller': 'TesterCtrl',
        'controllerAs': 'testerController',
        data:{ pageTitle: 'API Console' }
    });
};

function TesterParamsController($scope, $templateCache, $compile) {
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

            if (value.indexOf('ID') == -1) {
                input = 'tester/templates/field/object.tpl.html';
            } else {
                input = 'tester/templates/field/text.tpl.html';
            }

            var template = vm.TemplateCacheSvc_.get(input);
            template =
                template.replace(/tmpValue/gi, value)
                    .replace(/propertyName/gi, value)
                    .replace(/counter-value/gi, counter++);

            // Initialize Resolved Parameters to null
            if (angular.isDefined(scope.testerController.selectedMethod) &&
                scope.testerController.selectedMethod.resolvedParameters) {
                if (isNaN(value)) {
                    scope.testerController.selectedMethod.resolvedParameters[value] = null;
                }
            }

            element.append(template);
        });

        vm.CompileSvc_(element.contents())($scope);
    }
};

function TesterParams() {
    var directiveWorker = {
        restrict: 'E/',
        template: '<section id="divId"></section>',
        controller: 'TesterParamsCtrl',
        controllerAs: 'testerDirectiveCtrl',
        link: function (scope, element, attrs) {
            scope.$watch(function () {
                return scope.testerController.selectedMethod.params;
            }, function (newValue, oldValue) {
                if (angular.isDefined(newValue)) {
                    scope.testerController.selectedMethod.resolvedParameters = {};
                    scope.testerDirectiveCtrl.createParameters(newValue, element, scope);
                }
            });
        }
    }

    return directiveWorker;
};

function TesterFactory($injector, $parse) {
    var factory = {
        getParameters: _getParamNames,
        executeFunction: _executeFunction,
        getAngularFactories: _getServices
    };

    // Variables
    filterFactories = [
        'Auth',
        'Request'
    ];

    // Constants
    STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    ARGUMENT_NAMES = /([^\s,]+)/g;

    // Custom Behaviors
    function _cleanUp(parameters) {
        var returnValue = parameters.join(",");
        var pattern = new RegExp(/,{2}/gi);

        while(true) {
            if (pattern.test(returnValue)) {
                returnValue = returnValue.replace(/,{2}/gi, ",null,");
            } else {
                break;
            }
        }

        return returnValue;
    };

    function _getParamNames (func) {
        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if(result === null)
            result = [];
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

    function _executeFunction(service, method, scope) {
        var parameters = _getParametersList(method.resolvedParameters);

        if (!parameters) {
            parameters = 'null';
        }

        parameters = parameters
            .replace(/\(,{1}/gi, "(null,")
            .replace(/,\){1}/gi, ", null)");
        var results = null;
        var prefixCommand =
            'scope.testerController.InjectorSvc_.get("' + service.name + '").' +
            method.name.toLowerCase() + '(' + parameters + ')';

        method.callerStatement = prefixCommand;
        var serviceCall = scope.$eval(function(scope) {
            return scope.testerController.InjectorSvc_.get(service.name);
        }, scope);

        if (angular.isDefined(serviceCall)) {
            results = scope.$eval(function (scope) {
                if (parameters.indexOf("{") != -1) {
                    var jsonObject = JSON.parse(parameters);
                    return serviceCall[method.name](jsonObject);
                } else if (parameters.indexOf(",") == -1) {
                    return serviceCall[method.name](parameters.replace(/'/gi, ""));
                } else {
                    return serviceCall[method.name].apply(this, parameters.split(","));
                }
            }, scope);
        }

        if (results) {
            results
                .then(scope.testerController.operations.successful)
                .catch(scope.testerController.operations.exceptions);
        }
    };

    function _getServices(moduleName) {
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

function TesterController($scope, tester, $injector, $compile) {
    var scope = this;

    // Services
    scope.TesterSvc_ = tester;
    scope.ScopeSvc_ = $scope;
    scope.CompileSvc_ = $compile;
    scope.InjectorSvc_ = $injector;
    scope.statementPromise = undefined;

    // Variables
    scope.services = [];
    scope.selectedService = null;
    scope.selectedMethod = {
        resolvedParameters: {},
        callerStatement: null,
        results: null,
        params: null
    };
    scope.operations = {
        successful: function (data) {
            scope.selectedMethod.results = data;
        },
        exceptions: function(err) {
            if (angular.isDefined(err.data)) {
                if (angular.isDefined(err.data.Message)) {
                    scope.selectedMethod.results = err.data.Message;
                }
            } else {
                scope.selectedMethod.results = err;
            }
        }
    };

    // Custom Behaviors
    scope.callMethod = function() {
        scope.TesterSvc_.executeFunction(
            scope.selectedService,
            scope.selectedMethod,
            $scope);
    };

    scope.display = function (data, property) {
        if (data) {
            if (angular.isDefined(data[property])) {
                return data[property];
            }
        }

        return null;
    }

    // On Load
    scope.services = scope.TesterSvc_.getAngularFactories('orderCloud.sdk');
};