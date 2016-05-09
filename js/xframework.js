/*!
 * xframework 1.0.0
 * https://github.com/xwpongithub/xframework
 * @license MIT licensed
 */
'use strict';  
var Xframework = (function() {

    /** Number类型常量引用. */
    var INFINITY = 1 / 0,
        MAX_SAFE_INTEGER = 9007199254740991,
        MAX_INTEGER = 1.7976931348623157e+308,
        NAN = 0 / 0;

    var document = window.document,
        key,
        $,
        classList,
        emptyArray = [],
        slice = emptyArray.slice,
        filter = emptyArray.filter,
        undefined,
        elementDisplay = {},
        classCache = {},
        cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1, 'opacity': 1, 'z-index': 1, 'zoom': 1 },
        fragmentRE = /^\s*<(\w+|!)[^>]*>/,
        singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
        tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
        rootNodeRE = /^(?:body|html)$/i,
        capitalRE = /([A-Z])/g,
        methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],
        readyRE = /complete|loaded|interactive/,
        simpleSelectorRE = /^[\w-]*$/,
        objectTypes = {
            'function': true,
            'object': true
        },
        containers = {
            '*': document.createElement('div')
        },
        propertyIsEnumerable = Object.prototype.propertyIsEnumerable,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        objectToString = Object.prototype.toString,
        funcToString = Function.prototype.toString,
        objectCtorString = funcToString.call(Object),
        xframework = {},
        camelize,
        uniq,
        tempParent = document.createElement('div'),
        propMap = {
            'tabindex': 'tabIndex',
            'readonly': 'readOnly',
            'for': 'htmlFor',
            'class': 'className',
            'maxlength': 'maxLength',
            'usemap': 'useMap',
            'contenteditable': 'contentEditable'
        },
        isArray = Array.isArray ||
        function(object) {
            return object instanceof Array;
        };

    function type(obj) {
        return obj == null ? String(obj) :
            objectToString.call(obj) || "object";
    }

    /** 检查在Object.prototype上的属性是否是不可枚举的 */
    var nonEnumShadows = !propertyIsEnumerable.call({ 'valueOf': 1 }, 'valueOf');
    /** 检查是否支持exports */
    var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : undefined;
    /** 检查是否支持module. */
    var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : undefined;
    /** 检查是否遵循commonJS规范. */
    var moduleExports = (freeModule && freeModule.exports === freeExports) ? freeExports : undefined;

    /** 检查是否有内置Buffer支持 */
    var Buffer = moduleExports ? Buffer : undefined;

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]',
        arrayTag = '[object Array]',
        boolTag = '[object Boolean]',
        dateTag = '[object Date]',
        errorTag = '[object Error]',
        funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        mapTag = '[object Map]',
        numberTag = '[object Number]',
        objectTag = '[object Object]',
        promiseTag = '[object Promise]',
        regexpTag = '[object RegExp]',
        setTag = '[object Set]',
        stringTag = '[object String]',
        symbolTag = '[object Symbol]',
        weakMapTag = '[object WeakMap]',
        weakSetTag = '[object WeakSet]';

    function dasherize(str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase();
    }

    function children(element) {
        return 'children' in element ?
            slice.call(element.children) :
            $.map(element.childNodes, function(node) {
                if (node.nodeType == 1) return node
            })
    }

    function defaultDisplay(nodeName) {
        var element, display;
        if (!elementDisplay[nodeName]) {
            element = document.createElement(nodeName);
            document.body.appendChild(element);
            display = getComputedStyle(element, '').getPropertyValue("display");
            element.parentNode.removeChild(element);
            display === "none" && (display = "block");
            elementDisplay[nodeName] = display;
        }
        return elementDisplay[nodeName];
    }

    function classRE(name) {
        return name in classCache ?
            classCache[name] :
            (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'));
    }

    function maybeAddPx(name, value) {
        return (typeof value == "number" &&
            !cssNumber[dasherize(name)]) ? value + "px" : value;
    }

    function requestAnimationFrame(callback) {
        if (window.requestAnimationFrame) {
            return window.requestAnimationFrame(callback);
        } else if (window.webkitRequestAnimationFrame) {
            return window.webkitRequestAnimationFrame(callback);
        } else {
            return window.setTimeout(callback, 1000 / 60);
        }
    }

    function cancelAnimationFrame(id) {
        if (window.cancelAnimationFrame) {
            return window.cancelAnimationFrame(id);
        } else if (window.webkitCancelAnimationFrame) {
            return window.webkitCancelAnimationFrame(id);
        } else {
            return window.clearTimeout(id);
        }
    }

    function parseUrlQuery(url) {
        var query = {},
            i, params, param;
        if (url.indexOf('?') > -1) {
            url = url.split('?')[1];
        } else {
            return query;
        }
        params = url.split('&');
        for (i = 0; i < params.length; i++) {
            param = params[i].split('=');
            query[param[0]] = param[1];
        }
        return query;
    }

    /**
     * 返回调用toString()后得到的值.
     */
    function getTag(value) {
        return objectToString.call(value);
    }

    /**
     * 创建一个返回value的函数.
     */
    function constant(value) {
        return function() {
            return value;
        };
    }

    /**
     * 得到prototype的值
     */
    function getPrototype(value) {
        return Object.getPrototypeOf(Object(value));
    }

    /**
     * 将value转变成一个整数.
     * _.toInteger(3);
     * // => 3
     *
     * _.toInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toInteger(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toInteger('3');
     * // => 3
     */
    function toInteger(value) {
        if (!value) {
            return value === 0 ? value : 0;
        }
        value = toNumber(value);
        if (value === INFINITY || value === -INFINITY) {
            var sign = (value < 0 ? -1 : 1);
            return sign * MAX_INTEGER;
        }
        var remainder = value % 1;
        return value === value ? (remainder ? value - remainder : value) : 0;
    }

    xframework.matches = function(element, selector) {
        if (!selector || !element || element.nodeType !== 1) return false;
        var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
            element.oMatchesSelector || element.matchesSelector;
        if (matchesSelector) return matchesSelector.call(element, selector);
        var match, parent = element.parentNode,
            temp = !parent;
        if (temp)(parent = tempParent).appendChild(element);
        match = ~xframework.qsa(parent, selector).indexOf(element);
        temp && tempParent.removeChild(element);
        return match;
    };

    function isFunction(value) {
        var tag = isObject(value) ? objectToString.call(value) : '';
        return tag == funcTag || tag == genTag;
    }

    function isObject(value) {
        var type = typeof value;
        return !!value && (type == 'object' || type == 'function');
    }

    function isPlainObject(value) {
        if (!isObjectLike(value) ||
            objectToString.call(value) != objectTag) {
            return false;
        }
        var proto = getPrototype(value);
        if (proto === null) {
            return true;
        }
        var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
        return (typeof Ctor == 'function' &&
            Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
    }

    /**
     * 检查value是否是boolean类型
     * _.isBoolean(false);
     * // => true
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
        return value === true || value === false ||
            (isObjectLike(value) && objectToString.call(value) == boolTag);
    }

    /**
     * 检查value是否是日期类型
     *
     * _.isDate(new Date);
     * // => true
     *
     * _.isDate('Mon April 23 2012');
     * // => false
     */
    function isDate(value) {
        return isObjectLike(value) && objectToString.call(value) == dateTag;
    }

    /**
     * 检查value是否是元素类型
     *
     * _.isElement(document.body);
     * // => true
     *
     * _.isElement('<body>');
     * // => false
     */
    function isElement(value) {
        return !!value && value.nodeType === 1 && isObjectLike(value) && !isPlainObject(value);
    }

    /**
     * 检查value是否是字节数组
     *
     * _.isElement(document.body);
     * // => true
     *
     * _.isElement('<body>');
     * // => false
     */
    function isArrayBuffer(value) {
        return isObjectLike(value) && objectToString.call(value) == arrayBufferTag;
    }

    function isWindow(obj) {
        return obj != null && obj == obj.window
    }

    function isDocument(obj) {
        return obj != null && obj.nodeType == obj.DOCUMENT_NODE
    }

    function compact(array) {
        return filter.call(array, function(item) {
            return item != null;
        });
    }

    function camelize(str) {
        return str.replace(/-+(.)?/g,
            function(match, chr) {
                return chr ? chr.toUpperCase() : ''
            });
    }

    function flatten(array) {
        return array.length > 0 ?
            $.fn.concat.apply([], array) : array;
    }

    function uniq(array) {
        return filter.call(array, function(item, idx) {
            return array.indexOf(item) == idx;
        });
    }

    /**
     * 检查value是否是arguments类型
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
        // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
        return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
            (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
    }

    /**
     * 检查value是否是buffer类型.
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    var isBuffer = !Buffer ? constant(false) : function(value) {
        return value instanceof Buffer;
    };

    /**
     * 检查value是否是一个整数
     *
     * _.isInteger(3);
     * // => true
     *
     * _.isInteger(Number.MIN_VALUE);
     * // => false
     *
     * _.isInteger(Infinity);
     * // => false
     *
     * _.isInteger('3');
     * // => false
     */
    function isInteger(value) {
        return typeof value == 'number' && value == toInteger(value);
    }

    /**
     * 检查value是否是类数组长度
     * 
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
        return typeof value == 'number' &&
            value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }

    /**
     * 检查value是否是字符串类型
     *
     * _.isString('abc');
     * // => true
     *
     * _.isString(1);
     * // => false
     */
    function isString(value) {
        return typeof value == 'string' ||
            (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
    }

    /**
     * 检查value是否是null
     * @param  {[type]}  value [description]
     * @return {Boolean}       [description]
     */
    function isNull(value) {
        return value === null;
    }

    /**
     * 检查value是否是null或者undefined
     * @param  {[type]}  value [description]
     * @return {Boolean}       [description]
     */
    function isNil(value) {
        return value == null;
    }

    /**
     * 检查value是否是undefined
     * @param  {[type]}  value [description]
     * @return {Boolean}       [description]
     */
    function isUndefined(value) {
        return value === undefined;
    }

    /**
     * 检查value是否是number类型
     *
     * _.isNumber(3);
     * // => true
     *
     * _.isNumber(Number.MIN_VALUE);
     * // => true
     *
     * _.isNumber(Infinity);
     * // => true
     *
     * _.isNumber('3');
     * // => false
     */
    function isNumber(value) {
        return typeof value == 'number' ||
            (isObjectLike(value) && objectToString.call(value) == numberTag);
    }

    /**
     * 检查value是否是NaN类型
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
        return isNumber(value) && value != +value;
    }

    /**
     * 检查value是否是安全数字
     * _.isSafeInteger(3);
     * // => true
     *
     * _.isSafeInteger(Number.MIN_VALUE);
     * // => false
     *
     * _.isSafeInteger(Infinity);
     * // => false
     *
     * _.isSafeInteger('3');
     * // => false
     */
    function isSafeInteger(value) {
        return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
    }

    /**
     * 检查value是否是一个类数组. 如果它不是函数且有length属性，且这个length
     * 长度大于0小于最大值。
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
        return value != null && isLength(getLength(value)) && !isFunction(value);
    }

    /**
     * 检查value是否是一个类对象. 如果不为`null`
     * ，typeof取值的结果为object.
     *
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
        return !!value && typeof value == 'object';
    }



    /**
     *
     * _.isArrayLikeObject([1, 2, 3]);
     * // => true
     *
     * _.isArrayLikeObject(document.body.children);
     * // => true
     *
     * _.isArrayLikeObject('abc');
     * // => false
     *
     * _.isArrayLikeObject(_.noop);
     * // => false
     */
    function isArrayLikeObject(value) {
        return isObjectLike(value) && isArrayLike(value);
    }

    var getLength = baseProperty('length');

    function baseProperty(key) {
        return function(object) {
            return object == null ? undefined : object[key];
        };
    }

    xframework.qsa = function(element, selector) {
        var found,
            maybeID = selector[0] == '#',
            maybeClass = !maybeID && selector[0] == '.',
            nameOnly = maybeID || maybeClass ? selector.slice(1) : selector, //保证单字符标签仍然能被解析
            isSimple = simpleSelectorRE.test(nameOnly);
        return (isDocument(element) && isSimple && maybeID) ?
            ((found = element.getElementById(nameOnly)) ? [found] : []) :
            (element.nodeType !== 1 && element.nodeType !== 9) ? [] :
            slice.call(
                isSimple && !maybeID ?
                maybeClass ? element.getElementsByClassName(nameOnly) : //如果是简单选择器，那么它可能是一个类名
                element.getElementsByTagName(selector) :
                element.querySelectorAll(selector) //如果是复杂选择器，则调用querySelectorAll
            );
    };

    xframework.fragment = function(html, name, properties) {
        var dom = null,
            nodes = null,
            container = null;
        if (singleTagRE.test(html)) {
            dom = $(document.createElement(RegExp.$1));
        }
        if (!dom) {
            if (html.replace) {
                html = html.replace(tagExpanderRE, "<$1></$2>");
            }
            if (name === undefined) {
                name = fragmentRE.test(html) && RegExp.$1;
            }
            container = containers['*'];
            container.innerHTML = '' + html;
            dom = $.each(slice.call(container.childNodes), function() {
                container.removeChild(this);
            });
        }
        if (isPlainObject(properties)) {
            nodes = $(dom);
            $.each(properties, function(key, value) {
                if (methodAttributes.indexOf(key) > -1) {
                    nodes[key](value);
                } else {
                    nodes.attr(key, value);
                }
            });
        }
        return dom;
    };

    xframework.Self = function(dom, selector) {
        dom = dom || [];
        dom.__proto__ = $.fn;
        dom.selector = selector || '';
        return dom;
    };

    xframework.isSelf = function(object) {
        return object instanceof xframework.Self;
    };

    xframework.init = function(selector, context) {
        var dom = null;
        if (!selector) return xframework.Self();
        else if (typeof selector == 'string') {
            selector = selector.trim();
            if (selector[0] == '<' && fragmentRE.test(selector)) {
                dom = xframework.fragment(selector, RegExp.$1, context),
                    selector = null;
            } else if (context !== undefined) {
                return $(context).find(selector);
            } else {
                dom = xframework.qsa(document, selector);
            }
        } else if (isFunction(selector)) {
            return $(document).ready(selector);
        } else if (xframework.isSelf(selector)) {
            return selector;
        } else {
            if (isArray(selector)) {
                dom = compact(selector);
            } else if (isObject(selector)) {
                dom = [selector], selector = null;
            } else if (fragmentRE.test(selector)) {
                dom = xframework.fragment(selector.trim(), RegExp.$1, context),
                    selector = null;
            } else if (context !== undefined) {
                return $(context).find(selector);
            } else {
                dom = xframework.qsa(document, selector);
            }
        }
        return xframework.Self(dom, selector);
    };

    $ = function(selector, context) {
        return xframework.init(selector, context);
    };

    function extend(target, source, deep) {
        for (key in source) {
            if (deep && (isPlainObject(source[key]) ||
                    isArray(source[key]))) {
                if (isPlainObject(source[key]) && !isPlainObject(target[key])) {
                    target[key] = {};
                }
                if (isArray(source[key]) && !isArray(target[key])) {
                    target[key] = [];
                }
                extend(target[key], source[key], deep);
            } else if (source[key] !== undefined) {
                target[key] = source[key];
            }
        }
    }

    $.extend = function(target) {
        var deep, args = slice.call(arguments, 1);
        if (typeof target == 'boolean') {
            deep = target;
            target = args.shift();
        }
        args.forEach(function(arg) {
            extend(target, arg, deep);
        });
        return target;
    };

    function filtered(nodes, selector) {
        return selector == null ?
            $(nodes) : $(nodes).filter(selector);
    }

    $.contains = document.documentElement.contains ?
        function(parent, node) {
            return parent !== node && parent.contains(node);
        } :
        function(parent, node) {
            while (node && (node = node.parentNode)) {
                if (node === parent) {
                    return true;
                }
            }
            return false;
        };

    function funcArg(context, arg, idx, payload) {
        return isFunction(arg) ? arg.call(context, idx, payload) : arg;
    }

    function setAttribute(node, name, value) {
        value == null ? node.removeAttribute(name) : node.setAttribute(name, value);
    }

    function className(node, value) {
        var klass = node.className || '',
            svg = klass && klass.baseVal !== undefined;
        if (value === undefined)
            return svg ? klass.baseVal : klass
        svg ? (klass.baseVal = value) : (node.className = value);
    }

    // "true"  => true
    // "false" => false
    // "null"  => null
    // "42"    => 42
    // "42.5"  => 42.5
    // "08"    => "08"
    // JSON    => parse if valid
    // String  => self
    function deserializeValue(value) {
        try {
            return value ?
                value == "true" ||
                (value == "false" ? false :
                    value == "null" ? null :
                    +value + "" == value ? +value :
                    /^[\[\{]/.test(value) ? $.parseJSON(value) :
                    value) : value;
        } catch (e) {
            return value;
        }
    }

    /**
     * 检查value是否是empty object, collection, map或者set.
     *
     * _.isEmpty(null);
     * // => true
     *
     * _.isEmpty(true);
     * // => true
     *
     * _.isEmpty(1);
     * // => true
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({ 'a': 1 });
     * // => false
     */
    $.isEmpty = function(value) {
        if (isArrayLike(value) &&
            (isArray(value) || isString(value) || isFunction(value.splice) ||
                isArguments(value) || isBuffer(value))) {
            return !value.length;
        }
        if (isObjectLike(value)) {
            var tag = getTag(value);
            if (tag == mapTag || tag == setTag) {
                return !value.size;
            }
        }
        for (var key in value) {
            if (hasOwnProperty.call(value, key)) {
                return false;
            }
        }
        return !(nonEnumShadows && keys(value).length);
    };


    /**
     * 检查value是否是系统数组.
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */
    function isTypedArray(value) {
        return isObjectLike(value) &&
            isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
    }

    $.isFunction = isFunction;
    $.isObject = isObject;
    $.isArguments = isArguments;
    $.isPlainObject = isPlainObject;
    $.isBuffer = isBuffer;
    $.isString = isString;
    $.isArray = isArray;
    $.isElement = isElement;
    $.isDate = isDate;
    $.isBoolean = isBoolean;
    $.isArrayBuffer = isArrayBuffer;
    $.isWindow = isWindow;
    $.isDocument = isDocument;
    $.isDate = isDate;
    $.isLength = isLength;
    $.isNull = isNull;
    $.isNil = isNil;
    $.isUndefined = isUndefined;
    $.isNaN = isNaN;
    $.isNumber = isNumber;
    $.isSafeInteger = isSafeInteger;
    $.isInteger = isInteger;
    $.isTypedArray = isTypedArray;

    $.requestAnimationFrame = requestAnimationFrame;
    $.cancelAnimationFrame = cancelAnimationFrame;
    $.parseUrlQuery = parseUrlQuery;

    $.inArray = function(elem, array, i) {
        return emptyArray.indexOf.call(array, elem, i);
    };

    $.dataset = function(el) {
        return $(el).dataset();
    };

    $.getTranslate = function(el, axis) {
        var matrix, curTransform, curStyle, transformMatrix;
        if (typeof axis === 'undefined') {
            axis = 'x';
        }
        curStyle = window.getComputedStyle(el, null);
        if (window.WebKitCSSMatrix) {
            curTransform = curStyle.transform || curStyle.webkitTransform;
            if (curTransform.split(',').length > 6) {
                curTransform = curTransform.split(', ').map(function(a) {
                    return a.replace(',', '.');
                }).join(', ');
            }
            transformMatrix = new WebKitCSSMatrix(curTransform === 'none' ? '' : curTransform);
        } else {
            transformMatrix = curStyle.webkitTransform || curStyle.transform ||
                curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
            matrix = transformMatrix.toString().split(',');
        }
        if (axis === 'x') {
            if (window.WebKitCSSMatrix) {
                curTransform = transformMatrix.m41;
            } else {
                curTransform = parseFloat(matrix[4]);
            }
        }
        if (axis === 'y') {
            if (window.WebKitCSSMatrix) {
                curTransform = transformMatrix.m42;
            } else {
                curTransform = parseFloat(matrix[5]);
            }
        }
        return curTransform || 0;
    };

    $.camelCase = camelize;
    $.trim = function(str) {
        return str == null ? "" :
            String.prototype.trim.call(str);
    };

    $.map = function(elements, callback) {
        var value, values = [],
            i, key;
        if (isArrayLike(elements)) {
            var len = elements.length;
            for (i = 0; i < len; i++) {
                value = callback(elements[i], i);
                if (value != null) {
                    values.push(value);
                }
            }
        } else {
            for (key in elements) {
                value = callback(elements[key], key);
                if (value != null) {
                    values.push(value);
                }
            }
        }
        return flatten(values);
    };

    $.each = function(elements, callback) {
        var i, key;
        if (isArrayLike(elements)) {
            var len = elements.length;
            for (i = 0; i < len; i++) {
                if (callback.call(elements[i], i, elements[i]) === false) {
                    return elements;
                }
            }
        } else {
            for (key in elements) {
                if (callback.call(elements[key], key, elements[key]) === false) {
                    return elements;
                }
            }
        }
        return elements;
    };

    $.parseJSON = function(data) {
        try {
            data = data === 'true' ? true : data === 'false' ? false : data === 'null' ? null : +data + '' === data ? +data : /(?:\{[\s\S]*\}|\[[\s\S]*\])$/.test(data) ? JSON.parse(data) : data;
        } catch (ex) {
            return data;
        }
        return data;
    };

    $.stringify = function(data) {
        try {
            if (isObject(data) || isArray(data)) {
                data = JSON.stringify(data);
            }
        } catch (e) {
            return data;
        }
        return data;
    };

    $.hasVal = function(obj, key) {
        return obj != null && hasOwnProperty.call(obj, key);
    };

    var eq = function(a, b, aStack, bStack) {
        if (a === b) return a !== 0 || 1 / a === 1 / b;
        if (a == null || b == null) return a === b;
        var className = toString.call(a);
        if (className !== toString.call(b)) return false;
        switch (className) {
            case '[object RegExp]':
            case '[object String]':
                return '' + a === '' + b;
            case '[object Number]':
                if (+a !== +a) return +b !== +b;
                return +a === 0 ? 1 / +a === 1 / b : +a === +b;
            case '[object Date]':
            case '[object Boolean]':
                return +a === +b;
        }
        var areArrays = className === '[object Array]';
        if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object') return false;
            var aCtor = a.constructor,
                bCtor = b.constructor;
            if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor &&
                    isFunction(bCtor) && bCtor instanceof bCtor) && ('constructor' in a && 'constructor' in b)) {
                return false;
            }
        }
        aStack = aStack || [];
        bStack = bStack || [];
        var length = aStack.length;
        while (length--) {
            if (aStack[length] === a) return bStack[length] === b;
        }
        aStack.push(a);
        bStack.push(b);
        if (areArrays) {
            length = a.length;
            if (length !== b.length) return false;
            while (length--) {
                if (!eq(a[length], b[length], aStack, bStack)) return false;
            }
        } else {
            var keys = Object.keys(a),
                key;
            length = keys.length;
            if (Object.keys(b).length !== length) return false;
            while (length--) {
                key = keys[length];
                if (!($.hasVal(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
            }
        }
        aStack.pop();
        bStack.pop();
        return true;
    };

    $.isEqual = function(a, b) {
        return eq(a, b);
    };

    /**
     * 格式化数字到指定位数
     * @param  Number number 目标数字
     * @param  Number n  位数
     * @return String
     */
    $.formatNumber = function(number, n) {
        if (number && !$.isNumber(number) || n && !$.isNumber(n)) return;
        n = n || 2;
        var numStr = number.toString(),
            s = n - numStr.length;
        var zeros = '';
        for (var i = 0; i < s; i++) zeros += '0';
        return zeros + numStr;
    };

    //js设备检测，判断设备类型
    $.detect = function() {
        var os = {};
        var browser = {};
        var ua = window.navigator.userAgent;
        var webkit = ua.match(/Web[kK]it[\/]{0,1}([\d.]+)/),
            android = ua.match(/(Android);?[\s\/]+([\d.]+)?/),
            osx = ua.match(/\(Macintosh\; Intel .*OS X ([\d_.]+).+\)/),
            ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
            ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/),
            iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
            webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
            wp = ua.match(/Windows Phone ([\d.]+)/),
            touchpad = webos && ua.match(/TouchPad/),
            kindle = ua.match(/Kindle\/([\d.]+)/),
            silk = ua.match(/Silk\/([\d._]+)/),
            blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
            bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
            rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
            playbook = ua.match(/PlayBook/),
            chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
            firefox = ua.match(/Firefox\/([\d.]+)/),
            ie = ua.match(/MSIE\s([\d.]+)/) || ua.match(/Trident\/[\d](?=[^\?]+).*rv:([0-9.].)/),
            webview = !chrome && ua.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/),
            safari = webview || ua.match(/Version\/([\d.]+)([^S](Safari)|[^M]*(Mobile)[^S]*(Safari))/);

        if (browser.webkit = !!webkit) {
            browser.version = webkit[1];
        }
        //android
        if (android) {
            os.name = 'android';
            os.android = true;
            os.version = android[2];
        }

        if (iphone && !ipod) {
            os.name = 'iphone';
            os.ios = os.iphone = true;
            os.version = iphone[2].replace(/_/g, '.');
        }

        if (ipad) {
            os.name = 'ipad';
            os.ios = os.ipad = true;
            os.version = ipad[2].replace(/_/g, '.');
        }
        if (ipod) {
            os.name = 'ipod';
            os.ios = os.ipod = true;
            os.version = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
        }
        if (wp) {
            os.name = 'wp';
            os.wp = true;
            os.version = wp[1];
        }
        if (webos) {
            os.name = 'webos';
            os.webos = true;
            os.version = webos[2];
        }

        if (touchpad) {
            os.name = 'touchpad';
            os.touchpad = true;
        }

        if (blackberry) {
            os.name = 'blackberry';
            os.blackberry = true;
            os.version = blackberry[2];
        }

        if (bb10) {
            os.name = 'bb10';
            os.bb10 = true;
            os.version = bb10[2];
        }

        if (rimtabletos) {
            os.name = 'rimtabletos';
            os.rimtabletos = true;
            os.version = rimtabletos[2];
        }

        if (playbook) {
            browser.name = 'playbook';
            browser.playbook = true;
        }

        if (kindle) {
            os.name = 'kindle';
            os.kindle = true;
            os.version = kindle[1];
        }
        if (silk) {
            browser.name = 'silk';
            browser.silk = true;
            browser.version = silk[1];
        }
        if (!silk && os.android && ua.match(/Kindle Fire/)) {
            browser.name = 'silk';
            browser.silk = true;
        }
        if (chrome) {
            browser.name = 'chrome';
            browser.chrome = true;
            browser.version = chrome[1];
        }
        if (firefox) {
            browser.name = 'firefox';
            browser.firefox = true;
            browser.version = firefox[1];
        }
        if (ie) {
            browser.name = 'ie';
            browser.ie = true;
            browser.version = ie[1];
        }
        if (safari && (osx || os.ios)) {
            browser.name = 'safari';
            browser.safari = true;
            if (osx) {
                browser.version = safari[1];
            }
        }
        if (osx) {
            os.name = 'osx';
            os.version = osx[1].split('_').join('.');
        }
        if (webview) {
            browser.name = 'webview';
            browser.webview = true;
        }

        browser.isWeixin = /MicroMessenger/i.test(ua);
        browser.webview = webview;

        os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) || (firefox && ua.match(/Tablet/)) || (ie && !ua.match(/Phone/) && ua.match(/Touch/)));
        os.phone = !!(!os.tablet && !os.ipod && (android || iphone || webos || blackberry || bb10 || (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/)) || (ie && ua.match(/Touch/))));

        return {
            browser: browser,
            os: os,
            ua: ua
        };
    }();

    //适配statusbar样式
    function _fixIos7Bar(el) {
        if (!api) return;
        if (!$.isElement(el)) {
            console.warn('$.fixIos7Bar Function need el param, el param must be DOM Element');
            return;
        }
        if ($.detect.os.ios) {
            var strSV = $.detect.os.version;
            var numSV = parseInt(strSV, 10);
            var fullScreen = api.fullScreen;
            var iOS7StatusBarAppearance = api.iOS7StatusBarAppearance;
            if (numSV >= 7 && !fullScreen && iOS7StatusBarAppearance) {
                el.style.paddingTop = '20px';
            }
        }
    };

    $.fixStatusBar = function(el) {
        if (!$.isElement(el)) {
            console.warn('$api.fixStatusBar Function need el param, el param must be DOM Element');
            return;
        }
        if ($.detect.os.ios) {
            _fixIos7Bar(el);
        } else if ($.detect.os.android) {
            var ver = $.detect.os.version;
            ver = parseFloat(ver);
            if (ver >= 4.4) {
                el.style.paddingTop = '25px';
            }
        }
        var elHeight = window.getComputedStyle(el, null).getPropertyValue('height');
        $('.content').css('marginTop', elHeight);
    };

    /**
     * 得到一段随机的数字字符串
     * @param len 指定得到字符串的长度 
     * @return String
     */
    $.getRandomID = function(len) {
        len = len || 2;
        var seed = '1234567890';
        var seedLen = seed.length - 1;
        var randomId = '';
        while (len--) {
            randomId += seed[Math.round(Math.random() * seedLen)];
        }
        return randomId;
    };

    /**
     * 把数字转换成中文字符串
     * @param  Number n [description]
     * @return String
     */
    $.numToChinese = function(n) {
        var fraction = ['角', '分'];
        var digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
        var unit = [
            ['元', '万', '亿'],
            ['', '拾', '佰', '仟']
        ];
        var head = n < 0 ? '欠' : '';
        n = Math.abs(n);
        var s = '';
        for (var i = 0; i < fraction.length; i++) {
            s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
        }
        s = s || '整';
        n = Math.floor(n);
        for (var i = 0; i < unit[0].length && n > 0; i++) {
            var p = '';
            for (var j = 0; j < unit[1].length && n > 0; j++) {
                p = digit[n % 10] + unit[1][j] + p;
                n = Math.floor(n / 10);
            }
            s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
        }
        return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
    };

    /**
     * 产生一个在指定范围内的随机数
     * @param  Number min 最小值
     * @param  Number max 最大值
     * @return Number
     */
    $.random = function(min, max) {
        if (max == null) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    };

    $.fn = {
        forEach: emptyArray.forEach,
        reduce: emptyArray.reduce,
        push: emptyArray.push,
        sort: emptyArray.sort,
        indexOf: emptyArray.indexOf,
        concat: emptyArray.concat,
        map: function(fn) {
            return $($.map(this, function(el, i) {
                return fn.call(el, i, el);
            }));
        },
        slice: function() {
            return $(slice.apply(this, arguments));
        },
        ready: function(callback) {
            if (readyRE.test(document.readyState) && document.body) {
                callback($);
            } else {
                document.addEventListener('DOMContentLoaded', function() { callback($) }, false);
            }
            return this;
        },
        get: function(idx) {
            return idx === undefined ?
                slice.call(this) :
                this[idx >= 0 ? idx : idx + this.length];
        },
        toArray: function() {
            return this.get();
        },
        size: function() {
            return this.length;
        },
        remove: function() {
            return this.each(function() {
                if (this.parentNode != null) {
                    this.parentNode.removeChild(this);
                }
            });
        },
        each: function(callback) {
            emptyArray.every.call(this, function(el, idx) {
                return callback.call(el, idx, el) !== false;
            });
            return this;
        },
        filter: function(selector) {
            if (isFunction(selector)) {
                return this.not(this.not(selector));
            }
            return $(filter.call(this, function(element) {
                return xframework.matches(element, selector);
            }));
        },
        add: function(selector, context) {
            return $(uniq(this.concat($(selector, context))));
        },
        is: function(selector) {
            if (!this[0] || typeof selector === 'undefined')
                return false;
            var compareWith, i;
            if (typeof selector === 'string') {
                var el = this[0];
                if (el === document)
                    return selector === document;
                if (el === window)
                    return selector === window;
                if (el.matches)
                    return el.matches(selector);
                else if (el.webkitMatchesSelector)
                    return el.webkitMatchesSelector(selector);
                else {
                    compareWith = $(selector);
                    for (i = 0; i < compareWith.length; i++) {
                        if (compareWith[i] === this[0])
                            return true;
                    }
                    return false;
                }
            } else if (selector === document)
                return this[0] === document;
            else if (selector === window)
                return this[0] === window;
            else {
                if (selector.nodeType || selector instanceof Xframework) {
                    compareWith = selector.nodeType ? [selector] : selector;
                    for (i = 0; i < compareWith.length; i++) {
                        if (compareWith[i] === this[0])
                            return true;
                    }
                    return false;
                }
                return false;
            }
        },
        not: function(selector) {
            var nodes = [];
            if (isFunction(selector) && selector.call !== undefined) {
                this.each(function(idx) {
                    if (!selector.call(this, idx)) {
                        nodes.push(this);
                    }
                });
            } else {
                var excludes = typeof selector == 'string' ?
                    this.filter(selector) :
                    (isArrayLike(selector) && isFunction(selector.item)) ?
                    slice.call(selector) : $(selector)
                this.forEach(function(el) {
                    if (excludes.indexOf(el) < 0) {
                        nodes.push(el);
                    }
                });
            }
            return $(nodes);
        },
        has: function(selector) {
            return this.filter(function() {
                return isObject(selector) ?
                    $.contains(this, selector) :
                    $(this).find(selector).size();
            });
        },
        eq: function(idx) {
            return idx === -1 ?
                this.slice(idx) :
                this.slice(idx, +idx + 1);
        },
        first: function() {
            var el = this[0];
            return el && !isObject(el) ? el : $(el);
        },
        last: function() {
            var el = this[this.length - 1];
            return el && !isObject(el) ? el : $(el);
        },
        find: function(selector) {
            var result, $this = this;
            if (!selector) {
                result = $();
            } else if (typeof selector == 'object') {
                result = $(selector).filter(function() {
                    var node = this;
                    return emptyArray.some.call($this, function(parent) {
                        return $.contains(parent, node);
                    });
                });
            } else if (this.length == 1) {
                result = $(xframework.qsa(this[0], selector));
            } else {
                result = this.map(function() {
                    return xframework.qsa(this, selector);
                });
            }
            return result;
        },
        closest: function(selector, context) {
            var node = this[0],
                collection = false;
            if (typeof selector == 'object') {
                collection = $(selector);
            }
            while (node && !(collection ?
                    collection.indexOf(node) >= 0 :
                    xframework.matches(node, selector))) {
                node = node !== context && !isDocument(node) && node.parentNode;
            }
            return $(node);
        },
        parents: function(selector) {
            var ancestors = [],
                nodes = this;
            while (nodes.length > 0) {
                nodes = $.map(nodes, function(node) {
                    if ((node = node.parentNode) && !isDocument(node) &&
                        ancestors.indexOf(node) < 0) {
                        ancestors.push(node);
                        return node;
                    }
                });
            }
            return filtered(ancestors, selector);
        },
        parent: function(selector) {
            return filtered(uniq(this.pluck('parentNode')), selector);
        },
        children: function(selector) {
            return filtered(this.map(function() {
                return children(this);
            }), selector);
        },
        contents: function() {
            return this.map(function() {
                return slice.call(this.childNodes)
            });
        },
        siblings: function(selector) {
            return filtered(this.map(function(i, el) {
                return filter.call(
                    children(el.parentNode),
                    function(child) {
                        return child !== el
                    });
            }), selector);
        },
        empty: function() {
            return this.each(function() {
                this.innerHTML = '';
            });
        },
        pluck: function(property) {
            return $.map(this, function(el) {
                return el[property];
            });
        },
        show: function() {
            return this.each(function() {
                this.style.display === "none" && (this.style.display = '');
                if (getComputedStyle(this, '').getPropertyValue("display") === "none");
                this.style.display = defaultDisplay(this.nodeName);
            });
        },
        replaceWith: function(newContent) {
            return this.before(newContent).remove();
        },
        wrap: function(structure) {
            var func = isFunction(structure);
            if (this[0] && !func) {
                var dom = $(structure).get(0),
                    clone = dom.parentNode || this.length > 1;
            }
            return this.each(function(index) {
                $(this).wrapAll(
                    func ? structure.call(this, index) :
                    clone ? dom.cloneNode(true) : dom);
            });
        },
        wrapAll: function(structure) {
            if (this[0]) {
                $(this[0]).before(structure = $(structure));
                var children = null;
                while ((children = structure.children()).length) {
                    structure = children.first();
                }
                $(structure).append(this)
            }
            return this;
        },
        wrapInner: function(structure) {
            var func = isFunction(structure);
            return this.each(function(index) {
                var self = $(this),
                    contents = self.contents(),
                    dom = func ? structure.call(this, index) : structure
                contents.length ? contents.wrapAll(dom) : self.append(dom);
            })
        },
        unwrap: function() {
            this.parent().each(function() {
                $(this).replaceWith($(this).children());
            });
            return this;
        },
        clone: function() {
            return this.map(function() {
                return this.cloneNode(true);
            });
        },
        hide: function() {
            return this.css("display", "none");
        },
        toggle: function(setting) {
            return this.each(function() {
                var el = $(this);
                (setting === undefined ? el.css("display") == "none" : setting) ? el.show(): el.hide();
            });
        },
        prev: function(selector) {
            return $(this.pluck('previousElementSibling'))
                .filter(selector || '*');
        },
        prevAll: function(selector) {
            var prevEls = [];
            var el = this[0];
            if (!el) return $([]);
            while (el.previousElementSibling) {
                var prev = el.previousElementSibling;
                if (selector) {
                    if ($(prev).is(selector)) prevEls.push(prev);
                } else prevEls.push(prev);
                el = prev;
            }
            return $(prevEls);
        },
        next: function(selector) {
            return $(this.pluck('nextElementSibling')).filter(selector || '*');
        },
        nextAll: function(selector) {
            var nextEls = [];
            var el = this[0];
            if (!el) return $([]);
            while (el.nextElementSibling) {
                var next = el.nextElementSibling;
                if (selector) {
                    if ($(next).is(selector)) nextEls.push(next);
                } else nextEls.push(next);
                el = next;
            }
            return $(nextEls);
        },
        append: function(newChild) {
            var i, j;
            for (i = 0; i < this.length; i++) {
                if (typeof newChild === 'string') {
                    var tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newChild;
                    while (tempDiv.firstChild) {
                        this[i].appendChild(tempDiv.firstChild);
                    }
                } else if (newChild instanceof Dom7) {
                    for (j = 0; j < newChild.length; j++) {
                        this[i].appendChild(newChild[j]);
                    }
                } else {
                    this[i].appendChild(newChild);
                }
            }
            return this;
        },
        appendTo: function(parent) {
            $(parent).append(this);
            return this;
        },
        prepend: function(newChild) {
            var i, j;
            for (i = 0; i < this.length; i++) {
                if (typeof newChild === 'string') {
                    var tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newChild;
                    for (j = tempDiv.childNodes.length - 1; j >= 0; j--) {
                        this[i].insertBefore(tempDiv.childNodes[j], this[i].childNodes[0]);
                    }
                    // this[i].insertAdjacentHTML('afterbegin', newChild);
                } else if (xframework.isSelf(newChild)) {
                    for (j = 0; j < newChild.length; j++) {
                        this[i].insertBefore(newChild[j], this[i].childNodes[0]);
                    }
                } else {
                    this[i].insertBefore(newChild, this[i].childNodes[0]);
                }
            }
            return this;
        },
        prependTo: function(parent) {
            $(parent).prepend(this);
            return this;
        },
        insertBefore: function(selector) {
            var before = $(selector);
            for (var i = 0; i < this.length; i++) {
                if (before.length === 1) {
                    before[0].parentNode.insertBefore(this[i], before[0]);
                } else if (before.length > 1) {
                    for (var j = 0; j < before.length; j++) {
                        before[j].parentNode.insertBefore(this[i].cloneNode(true), before[j]);
                    }
                }
            }
        },
        insertAfter: function(selector) {
            var after = $(selector);
            for (var i = 0; i < this.length; i++) {
                if (after.length === 1) {
                    after[0].parentNode.insertBefore(this[i], after[0].nextSibling);
                } else if (after.length > 1) {
                    for (var j = 0; j < after.length; j++) {
                        after[j].parentNode.insertBefore(this[i].cloneNode(true), after[j].nextSibling);
                    }
                }
            }
        },
        html: function(html) {
            return 0 in arguments ?
                this.each(function(idx) {
                    var originHtml = this.innerHTML;
                    $(this).empty().append(funcArg(this, html, idx, originHtml));
                }) :
                (0 in this ? this[0].innerHTML : null);
        },
        text: function(text) {
            return 0 in arguments ?
                this.each(function(idx) {
                    var newText = funcArg(this, text, idx, this.textContent);
                    this.textContent = newText == null ? '' : '' + newText;
                }) : (0 in this ? this[0].textContent : null);
        },
        attr: function(name, value) {
            var result;
            return (typeof name == 'string' && !(1 in arguments)) ?
                (!this.length || this[0].nodeType !== 1 ? undefined :
                    (!(result = this[0].getAttribute(name)) && name in this[0]) ?
                    this[0][name] : result) :
                this.each(function(idx) {
                    if (this.nodeType !== 1) return;
                    if (isObject(name)) {
                        for (key in name) {
                            setAttribute(this, key, name[key])
                        }
                    } else {
                        setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)));
                    }
                });
        },
        removeAttr: function(name) {
            return this.each(function() {
                this.nodeType === 1 &&
                    name.split(' ').forEach(function(attribute) {
                        setAttribute(this, attribute);
                    }, this)
            });
        },
        prop: function(name, value) {
            name = propMap[name] || name;
            return (1 in arguments) ?
                this.each(function(idx) {
                    this[name] = funcArg(this, value, idx, this[name]);
                }) : (this[0] && this[0][name]);
        },
        dataset: function() {
            var dataset = {},
                ds = this[0].dataset;
            for (var key in ds) {
                var item = (dataset[key] = ds[key]);
                if (item === 'false')
                    dataset[key] = false;
                else if (item === 'true')
                    dataset[key] = true;
                else if (parseFloat(item) === item * 1)
                    dataset[key] = item * 1;
            }
            return $.extend({}, dataset, this[0].__eleData);
        },
        data: function(key, value) {
            key = camelize(key);
            var tmpData = $(this).dataset();
            if (!key) {
                return tmpData;
            }
            if (typeof value === 'undefined') {
                var dataVal = tmpData[key],
                    __eD = this[0].__eleData;
                if (__eD && (key in __eD)) {
                    return __eD[key];
                } else {
                    return dataVal;
                }
            } else {
                for (var i = 0; i < this.length; i++) {
                    var el = this[i];
                    if (key in tmpData) {
                        delete el.dataset[key];
                    }
                    if (!el.__eleData) {
                        el.__eleData = {};
                    }
                    el.dataset[key] = value;
                    el.__eleData[key] = value;
                }
                return this;
            }
        },
        val: function(value) {
            return 0 in arguments ?
                this.each(function(idx) {
                    this.value = funcArg(this, value, idx, this.value);
                }) :
                (this[0] && (this[0].multiple ?
                    $(this[0]).find('option').filter(function() {
                        return this.selected
                    }).pluck('value') :
                    this[0].value));
        },
        offset: function(coordinates) {
            if (coordinates) {
                return this.each(function(index) {
                    var $this = $(this),
                        coords = funcArg(this, coordinates, index, $this.offset()),
                        parentOffset = $this.offsetParent().offset(),
                        props = {
                            top: coords.top - parentOffset.top,
                            left: coords.left - parentOffset.left
                        };
                    if ($this.css('position') == 'static') {
                        props['position'] = 'relative';
                    }
                    $this.css(props);
                });
            }
            if (!this.length) {
                return null;
            }
            var obj = this[0].getBoundingClientRect();
            return {
                left: obj.left + window.pageXOffset,
                top: obj.top + window.pageYOffset,
                width: Math.round(obj.width),
                height: Math.round(obj.height)
            };
        },
        css: function(property, value) {
            if (arguments.length < 2) {
                var computedStyle, element = this[0];
                if (!element) return;
                computedStyle = getComputedStyle(element, '');
                if (typeof property == 'string') {
                    return element.style[camelize(property)] ||
                        computedStyle.getPropertyValue(property);
                } else if (isArray(property)) {
                    var props = {};
                    $.each(property, function(_, prop) {
                        props[prop] = (element.style[camelize(prop)] ||
                            computedStyle.getPropertyValue(prop));
                    });
                    return props;
                }
            }
            var css = '';
            if (isString(property)) {
                if (!value && value !== 0) {
                    this.each(function() {
                        this.style.removeProperty(dasherize(property));
                    });
                } else {
                    css = dasherize(property) + ":" +
                        maybeAddPx(property, value);
                }
            } else {
                for (key in property) {
                    if (!property[key] && property[key] !== 0) {
                        this.each(function() {
                            this.style.removeProperty(dasherize(key));
                        });
                    } else {
                        css += dasherize(key) + ':' +
                            maybeAddPx(key, property[key]) + ';';
                    }
                }
            }
            return this.each(function() {
                this.style.cssText += ';' + css;
            });
        },
        index: function(element) {
            return element ? this.indexOf($(element)[0]) :
                this.parent().children().indexOf(this[0]);
        },
        hasClass: function(name) {
            if (!name) return false;
            return emptyArray.some.call(this, function(el) {
                return this.test(className(el));
            }, classRE(name));
        },
        addClass: function(name) {
            if (!name) return this;
            return this.each(function(idx) {
                if (!('className' in this)) return;
                var classList = [];
                var cls = className(this),
                    newName = funcArg(this, name, idx, cls);
                newName.split(/\s+/g).forEach(function(klass) {
                    if (!$(this).hasClass(klass)) {
                        classList.push(klass);
                    }
                }, this);
                classList.length &&
                    className(this, cls + (cls ? " " : "") + classList.join(" "));
            });
        },
        removeClass: function(name) {
            return this.each(function(idx) {
                if (!('className' in this)) return;
                if (name === undefined) {
                    return className(this, '');
                }
                classList = className(this);
                funcArg(this, name, idx, classList).split(/\s+/g)
                    .forEach(function(klass) {
                        classList = classList.replace(classRE(klass), " ");
                    });
                className(this, classList.trim());
            });
        },
        toggleClass: function(name, when) {
            if (!name) return this;
            return this.each(function(idx) {
                var $this = $(this),
                    names = funcArg(this, name, idx, className(this));
                names.split(/\s+/g).forEach(function(klass) {
                    (when === undefined ? !$this.hasClass(klass) : when) ?
                    $this.addClass(klass): $this.removeClass(klass);
                });
            });
        },
        position: function() {
            if (!this.length) return;
            var elem = this[0],
                offsetParent = this.offsetParent(),
                offset = this.offset(),
                parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();
            offset.top -= parseFloat($(elem).css('margin-top')) || 0;
            offset.left -= parseFloat($(elem).css('margin-left')) || 0;
            parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0;
            parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0;
            return {
                top: offset.top - parentOffset.top,
                left: offset.left - parentOffset.left
            };
        },
        offsetParent: function() {
            return this.map(function() {
                var parent = this.offsetParent || document.body;
                while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static") {
                    parent = parent.offsetParent;
                }
                return parent;
            });
        },
        animationEnd: function(callback) {
            __dealCssEvent.call(this, ['webkitAnimationEnd', 'animationend'], callback);
            return this;
        },
        transition: function(duration) {
            if (typeof duration !== 'string') {
                duration = duration + 'ms';
            }
            for (var i = 0; i < this.length; i++) {
                var elStyle = this[i].style;
                elStyle.webkitTransitionDuration = elStyle.transitionDuration = duration;
            }
            return this;
        },
        transitionEnd: function(callback) {
            __dealCssEvent.call(this, ['webkitTransitionEnd', 'transitionend'], callback);
            return this;
        },
        transform: function(transform) {
            for (var i = 0; i < this.length; i++) {
                var elStyle = this[i].style;
                elStyle.webkitTransform = elStyle.transform = transform;
            }
            return this;
        }
    };

    function __dealCssEvent(eventNameArr, callback) {
        var events = eventNameArr,
            i, dom = this;

        function fireCallBack(e) {
            if (e.target !== this)
                return;
            callback.call(this, e);
            for (i = 0; i < events.length; i++) {
                dom.off(events[i], fireCallBack);
            }
        }
        if (callback) {
            for (i = 0; i < events.length; i++) {
                dom.on(events[i], fireCallBack);
            }
        }
    }

    ['width', 'height'].forEach(function(dimension) {
        var dimensionProperty =
            dimension.replace(/./, function(m) {
                return m[0].toUpperCase()
            });
        $.fn[dimension] = function(value) {
            var offset, el = this[0];
            if (value === undefined)
                return isWindow(el) ? el['inner' + dimensionProperty] :
                    isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
                    (offset = this.offset()) && offset[dimension];
            else
                return this.each(function(idx) {
                    el = $(this)
                    el.css(dimension, funcArg(this, value, idx, el[dimension]()));
                });
        };
        var Dimension = dimension.replace(/./, function(m) {
            return m[0].toUpperCase();
        });
        $.fn['outer' + Dimension] = function(margin) {
            var elem = this;
            if (elem) {
                var size = elem[dimension]();
                var sides = {
                    'width': ['left', 'right'],
                    'height': ['top', 'bottom']
                };
                sides[dimension].forEach(function(side) {
                    if (margin)
                        size += parseInt(elem.css('margin-' + side), 10);
                });
                return size;
            } else {
                return null;
            }
        };
    });

    function traverseNode(node, fun) {
        fun(node)
        for (var i = 0, len = node.childNodes.length; i < len; i++)
            traverseNode(node.childNodes[i], fun)
    }


    //事件支持
    var _zid = 1,
        handlers = {},
        specialEvents = {},
        focusinSupported = 'onfocusin' in window,
        focus = { focus: 'focusin', blur: 'focusout' },
        hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' };
    specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents';

    function zid(element) {
        return element._zid || (element._zid = _zid++);
    }

    function findHandlers(element, event, fn, selector) {
        event = parse(event)
        if (event.ns) var matcher = matcherFor(event.ns);
        return (handlers[zid(element)] || []).filter(function(handler) {
            return handler && (!event.e || handler.e == event.e) && (!event.ns || matcher.test(handler.ns)) && (!fn || zid(handler.fn) === zid(fn)) && (!selector || handler.sel == selector);
        });
    }

    function parse(event) {
        var parts = ('' + event).split('.');
        return { e: parts[0], ns: parts.slice(1).sort().join(' ') };
    }

    function matcherFor(ns) {
        return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)');
    }

    function eventCapture(handler, captureSetting) {
        return handler.del &&
            (!focusinSupported && (handler.e in focus)) ||
            !!captureSetting;
    }

    function realEvent(type) {
        return hover[type] ||
            (focusinSupported && focus[type]) || type;
    }

    function add(element, events, fn, data, selector, delegator, capture) {
        var id = zid(element),
            set = (handlers[id] || (handlers[id] = []));
        events.split(/\s/).forEach(function(event) {
            if (event == 'ready') return $(document).ready(fn);
            var handler = parse(event);
            handler.fn = fn;
            handler.sel = selector;
            if (handler.e in hover) fn = function(e) {
                var related = e.relatedTarget;
                if (!related || (related !== this && !$.contains(this, related))) {
                    return handler.fn.apply(this, arguments);
                }
            }
            handler.del = delegator;
            var callback = delegator || fn;
            handler.proxy = function(e) {
                e = compatible(e);
                if (e.isImmediatePropagationStopped()) return;
                e.data = data;
                var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args));
                if (result === false) e.preventDefault(), e.stopPropagation();
                return result;
            };
            handler.i = set.length;
            set.push(handler);
            if ('addEventListener' in element) {
                element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture));
            }
        });
    }

    function remove(element, events, fn, selector, capture) {
        var id = zid(element);
        (events || '').split(/\s/).forEach(function(event) {
            findHandlers(element, event, fn, selector).forEach(function(handler) {
                delete handlers[id][handler.i];
                if ('removeEventListener' in element) {
                    element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture));
                }
            })
        })
    }
    $.event = { add: add, remove: remove };
    $.fn.one = function(event, selector, data, callback) {
        return this.on(event, selector, data, callback, 1);
    };

    var returnTrue = function() {
            return true
        },
        returnFalse = function() {
            return false
        },
        ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/,
        eventMethods = {
            preventDefault: 'isDefaultPrevented',
            stopImmediatePropagation: 'isImmediatePropagationStopped',
            stopPropagation: 'isPropagationStopped'
        };

    function compatible(event, source) {
        if (source || !event.isDefaultPrevented) {
            source || (source = event);

            $.each(eventMethods, function(name, predicate) {
                var sourceMethod = source[name];
                event[name] = function() {
                    this[predicate] = returnTrue;
                    return sourceMethod &&
                        sourceMethod.apply(source, arguments);
                }
                event[predicate] = returnFalse;
            });
            if (source.defaultPrevented !== undefined ? source.defaultPrevented :
                'returnValue' in source ? source.returnValue === false :
                source.getPreventDefault && source.getPreventDefault())
                event.isDefaultPrevented = returnTrue;
        }
        return event;
    }

    function createProxy(event) {
        var key, proxy = { originalEvent: event };
        for (key in event) {
            if (!ignoreProperties.test(key) && event[key] !== undefined) {
                proxy[key] = event[key];
            }
        }
        return compatible(proxy, event);
    }

    $.fn.on = function(event, selector, data, callback, one) {
        var autoRemove,
            delegator,
            $this = this;
        if (event && !isString(event)) {
            $.each(event, function(type, fn) {
                $this.on(type, selector, data, fn, one);
            });
            return $this;
        }
        if (!isString(selector) &&
            !isFunction(callback) &&
            callback !== false) {
            callback = data, data = selector, selector = undefined;
        }
        if (isFunction(data) || data === false) {
            callback = data, data = undefined;
        }
        if (callback === false) {
            callback = returnFalse;
        }
        return $this.each(function(_, element) {
            if (one) {
                autoRemove = function(e) {
                    remove(element, e.type, callback);
                    return callback.apply(this, arguments);
                };
            }
            if (selector) {
                delegator = function(e) {
                    var evt, match =
                        $(e.target).closest(selector, element).get(0);
                    if (match && match !== element) {
                        evt = $.extend(createProxy(e), { currentTarget: match, liveFired: element });
                        return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)));
                    }
                };
            }
            add(element, event, callback, data, selector, delegator || autoRemove);
        });
    };
    $.fn.off = function(event, selector, callback) {
        var $this = this;
        if (event && !isString(event)) {
            $.each(event, function(type, fn) {
                $this.off(type, selector, fn);
            });
            return $this;
        }
        if (!isString(selector) && !isFunction(callback) && callback !== false) {
            callback = selector,
                selector = undefined;
        }
        if (callback === false) {
            callback = returnFalse
        }
        return $this.each(function() {
            remove(this, event, callback, selector);
        });
    };
    $.fn.trigger = function(event, args) {
        event = (isString(event) ||
            $.isPlainObject(event)) ? $.Event(event) : compatible(event);
        event._args = args;
        return this.each(function() {
            if (event.type in focus &&
                typeof this[event.type] == "function") {
                this[event.type]();
            } else if ('dispatchEvent' in this) {
                this.dispatchEvent(event);
            } else {
                $(this).triggerHandler(event, args);
            }
        });
    };
    $.fn.triggerHandler = function(event, args) {
        var e, result;
        this.each(function(i, element) {
            e = createProxy(isString(event) ? $.Event(event) : event);
            e._args = args;
            e.target = element;
            $.each(findHandlers(element, event.type || event), function(i, handler) {
                result = handler.proxy(e);
                if (e.isImmediatePropagationStopped()) {
                    return false;
                }
            });
        });
        return result;
    };
    ('focusin focusout focus blur load resize scroll unload click dblclick ' +
        'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
        'change select keydown keypress keyup error').split(' ').forEach(function(event) {
        $.fn[event] = function(callback) {
            return (0 in arguments) ?
                this.on(event, callback) :
                this.trigger(event);
        }
    });
    $.Event = function(type, props) {
        if (!isString(type)) {
            props = type,
                type = props.type;
        }
        var event = document.createEvent(specialEvents[type] || 'Events'),
            bubbles = true;
        if (props)
            for (var name in props)(name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name]);
        event.initEvent(type, bubbles, true);
        return compatible(event);
    };

    //一般正则检测
    $.regex = {};
    //15位的身份证号码
    $.regex.isIDCard15 = function(str) {
        return _checkReg(/^[1-9]\d{7}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}$/, str);
    };
    //18位的身份证号码
    $.regex.isIDCard18 = function(str) {
        return _checkReg(/^[1-9]\d{5}[1-9]\d{3}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}([0-9]|X)$/, str);
    };
    //搜索关键字是否含有特殊字符
    $.regex.isKeyword = function(str) {
        return _checkReg(/^(?!.*?[\~\`\·\！\!@\#\￥\$%\……\^&\*\(\)\（\）\_\-\——\+\=\【\】\[\]\{\}\|\、\\\：\:\;\；\"\”\“\’\'\'\<\>\《\》\,\，\。\.\?\？\/]).*$/, str);
    };
    //ip是否合法
    $.regex.isIp = function(str) {
        return _checkReg(/^[0-9.]{1,20}$/, str);
    };
    //校验用户名：只能输入5-20个以字母开头、可带数字、“_”、“.”
    $.regex.isNormalUsername = function(str) {
        return _checkReg(/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/, str);
    };
    //校验用户名：只能输入1-30个以字母开头
    $.regex.isLetterUsername = function(str) {
        return _checkReg(/^[a-zA-Z]{1,30}$/, str);
    };
    //校验邮政编码
    $.regex.isPostalCode = function(str) {
        return _checkReg(/^[a-zA-Z0-9 ]{3,12}$/, str);
    };
    //校验手机号码
    $.regex.isPhone = function() {
        return _checkReg(/^((13[0-9])|(14[5|7])|(15([0-3]|[5-9]))|(18[0,5-9]))\\d{8}$/, str);
    };
    //邮箱是否合法
    $.regex.isEmail = function(str) {
        return _checkReg(/^(\w)+(\.\w+)*@(\w)+((\.\w+)+)$/, str);
    };
    //网址是否合法
    $.regex.isUrl = function(str) {
        return _checkReg(/^((https?|ftp|news):\/\/)?([a-z]([a-z0-9\-]*[\.。])+([a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel)|(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))(\/[a-z0-9_\-\.~]+)*(\/([a-z0-9_\-\.]*)(\?[a-z0-9+_\-\.%=&]*)?)?(#[a-z][a-z0-9_]*)?$/, str);
    };
    //是否是中文
    $.regex.isChinese = function(str) {
        return _checkReg(/^[\u4e00-\u9fa5]+$/, str);
    };
    //QQ是否合法
    $.regex.isQQ = function(str) {
        return _checkReg(/[1-9][0-9]{4,}/, str);
    };

    function _checkReg(reg, str) {
        if (reg.test(str)) {
            return true;
        }
        return false;
    }

    /*加密模块*/
    $.crypto = {
        sha1: function(msg) {
            function rotate_left(n, s) {
                var t4 = (n << s) | (n >>> (32 - s));
                return t4;
            };

            function lsb_hex(val) {
                var str = "";
                var i;
                var vh;
                var vl;

                for (i = 0; i <= 6; i += 2) {
                    vh = (val >>> (i * 4 + 4)) & 0x0f;
                    vl = (val >>> (i * 4)) & 0x0f;
                    str += vh.toString(16) + vl.toString(16);
                }
                return str;
            };

            function cvt_hex(val) {
                var str = "";
                var i;
                var v;

                for (i = 7; i >= 0; i--) {
                    v = (val >>> (i * 4)) & 0x0f;
                    str += v.toString(16);
                }
                return str;
            };

            function Utf8Encode(string) {
                string = string.replace(/\r\n/g, "\n");
                var utftext = "";

                for (var n = 0; n < string.length; n++) {

                    var c = string.charCodeAt(n);

                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    } else if ((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    } else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }

                }

                return utftext;
            };

            var blockstart;
            var i, j;
            var W = new Array(80);
            var H0 = 0x67452301;
            var H1 = 0xEFCDAB89;
            var H2 = 0x98BADCFE;
            var H3 = 0x10325476;
            var H4 = 0xC3D2E1F0;
            var A, B, C, D, E;
            var temp;

            msg = Utf8Encode(msg);

            var msg_len = msg.length;

            var word_array = new Array();
            for (i = 0; i < msg_len - 3; i += 4) {
                j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 | msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
                word_array.push(j);
            }

            switch (msg_len % 4) {
                case 0:
                    i = 0x080000000;
                    break;
                case 1:
                    i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
                    break;

                case 2:
                    i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
                    break;

                case 3:
                    i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
                    break;
            }

            word_array.push(i);

            while ((word_array.length % 16) != 14)
                word_array.push(0);

            word_array.push(msg_len >>> 29);
            word_array.push((msg_len << 3) & 0x0ffffffff);

            for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {

                for (i = 0; i < 16; i++)
                    W[i] = word_array[blockstart + i];
                for (i = 16; i <= 79; i++)
                    W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

                A = H0;
                B = H1;
                C = H2;
                D = H3;
                E = H4;

                for (i = 0; i <= 19; i++) {
                    temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                for (i = 20; i <= 39; i++) {
                    temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                for (i = 40; i <= 59; i++) {
                    temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                for (i = 60; i <= 79; i++) {
                    temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                H0 = (H0 + A) & 0x0ffffffff;
                H1 = (H1 + B) & 0x0ffffffff;
                H2 = (H2 + C) & 0x0ffffffff;
                H3 = (H3 + D) & 0x0ffffffff;
                H4 = (H4 + E) & 0x0ffffffff;

            }
            var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
            return temp.toLowerCase();
        },
        md5: function(data) {
            // convert number to (unsigned) 32 bit hex, zero filled string
            function to_zerofilled_hex(n) {
                var t1 = (n >>> 0).toString(16)
                return "00000000".substr(0, 8 - t1.length) + t1
            }

            // convert array of chars to array of bytes
            function chars_to_bytes(ac) {
                var retval = []
                for (var i = 0; i < ac.length; i++) {
                    retval = retval.concat(str_to_bytes(ac[i]))
                }
                return retval
            }

            // convert a 64 bit unsigned number to array of bytes. Little endian
            function int64_to_bytes(num) {
                var retval = []
                for (var i = 0; i < 8; i++) {
                    retval.push(num & 0xFF)
                    num = num >>> 8
                }
                return retval
            }

            //  32 bit left-rotation
            function rol(num, places) {
                return ((num << places) & 0xFFFFFFFF) | (num >>> (32 - places))
            }

            // The 4 MD5 functions
            function fF(b, c, d) {
                return (b & c) | (~b & d)
            }

            function fG(b, c, d) {
                return (d & b) | (~d & c)
            }

            function fH(b, c, d) {
                return b ^ c ^ d
            }

            function fI(b, c, d) {
                return c ^ (b | ~d)
            }

            // pick 4 bytes at specified offset. Little-endian is assumed
            function bytes_to_int32(arr, off) {
                return (arr[off + 3] << 24) | (arr[off + 2] << 16) | (arr[off + 1] << 8) | (arr[off])
            }

            /*
             Conver string to array of bytes in UTF-8 encoding
             See:
             http://www.dangrossman.info/2007/05/25/handling-utf-8-in-javascript-php-and-non-utf8-databases/
             http://stackoverflow.com/questions/1240408/reading-bytes-from-a-javascript-string
             How about a String.getBytes(<ENCODING>) for Javascript!? Isn't it time to add it?
             */
            function str_to_bytes(str) {
                var retval = []
                for (var i = 0; i < str.length; i++)
                    if (str.charCodeAt(i) <= 0x7F) {
                        retval.push(str.charCodeAt(i))
                    } else {
                        var tmp = encodeURIComponent(str.charAt(i)).substr(1).split('%')
                        for (var j = 0; j < tmp.length; j++) {
                            retval.push(parseInt(tmp[j], 0x10))
                        }
                    }
                return retval
            }

            // convert the 4 32-bit buffers to a 128 bit hex string. (Little-endian is assumed)
            function int128le_to_hex(a, b, c, d) {
                var ra = ""
                var t = 0
                var ta = 0
                for (var i = 3; i >= 0; i--) {
                    ta = arguments[i]
                    t = (ta & 0xFF)
                    ta = ta >>> 8
                    t = t << 8
                    t = t | (ta & 0xFF)
                    ta = ta >>> 8
                    t = t << 8
                    t = t | (ta & 0xFF)
                    ta = ta >>> 8
                    t = t << 8
                    t = t | ta
                    ra = ra + to_zerofilled_hex(t)
                }
                return ra
            }

            // conversion from typed byte array to plain javascript array
            function typed_to_plain(tarr) {
                var retval = new Array(tarr.length)
                for (var i = 0; i < tarr.length; i++) {
                    retval[i] = tarr[i]
                }
                return retval
            }

            // check input data type and perform conversions if needed
            var databytes = null
                // String
            var type_mismatch = null
            if (typeof data == 'string') {
                // convert string to array bytes
                databytes = str_to_bytes(data)
            } else if (data.constructor == Array) {
                if (data.length === 0) {
                    // if it's empty, just assume array of bytes
                    databytes = data
                } else if (typeof data[0] == 'string') {
                    databytes = chars_to_bytes(data)
                } else if (typeof data[0] == 'number') {
                    databytes = data
                } else {
                    type_mismatch = typeof data[0]
                }
            } else if (typeof ArrayBuffer != 'undefined') {
                if (data instanceof ArrayBuffer) {
                    databytes = typed_to_plain(new Uint8Array(data))
                } else if ((data instanceof Uint8Array) || (data instanceof Int8Array)) {
                    databytes = typed_to_plain(data)
                } else if ((data instanceof Uint32Array) || (data instanceof Int32Array) || (data instanceof Uint16Array) || (data instanceof Int16Array) || (data instanceof Float32Array) || (data instanceof Float64Array)) {
                    databytes = typed_to_plain(new Uint8Array(data.buffer))
                } else {
                    type_mismatch = typeof data
                }
            } else {
                type_mismatch = typeof data
            }

            if (type_mismatch) {
                alert('MD5 type mismatch, cannot process ' + type_mismatch)
            }

            function _add(n1, n2) {
                return 0x0FFFFFFFF & (n1 + n2)
            }

            return do_digest()

            function do_digest() {
                // function update partial state for each run
                function updateRun(nf, sin32, dw32, b32) {
                    var temp = d
                    d = c
                    c = b
                        //b = b + rol(a + (nf + (sin32 + dw32)), b32)
                    b = _add(b, rol(_add(a, _add(nf, _add(sin32, dw32))), b32))
                    a = temp
                }

                // save original length
                var org_len = databytes.length

                // first append the "1" + 7x "0"
                databytes.push(0x80)

                // determine required amount of padding
                var tail = databytes.length % 64
                    // no room for msg length?
                if (tail > 56) {
                    // pad to next 512 bit block
                    for (var i = 0; i < (64 - tail); i++) {
                        databytes.push(0x0)
                    }
                    tail = databytes.length % 64
                }
                for (i = 0; i < (56 - tail); i++) {
                    databytes.push(0x0)
                }
                // message length in bits mod 512 should now be 448
                // append 64 bit, little-endian original msg length (in *bits*!)
                databytes = databytes.concat(int64_to_bytes(org_len * 8))

                // initialize 4x32 bit state
                var h0 = 0x67452301
                var h1 = 0xEFCDAB89
                var h2 = 0x98BADCFE
                var h3 = 0x10325476

                // temp buffers
                var a = 0,
                    b = 0,
                    c = 0,
                    d = 0

                // Digest message
                for (i = 0; i < databytes.length / 64; i++) {
                    // initialize run
                    a = h0
                    b = h1
                    c = h2
                    d = h3

                    var ptr = i * 64

                    // do 64 runs
                    updateRun(fF(b, c, d), 0xd76aa478, bytes_to_int32(databytes, ptr), 7)
                    updateRun(fF(b, c, d), 0xe8c7b756, bytes_to_int32(databytes, ptr + 4), 12)
                    updateRun(fF(b, c, d), 0x242070db, bytes_to_int32(databytes, ptr + 8), 17)
                    updateRun(fF(b, c, d), 0xc1bdceee, bytes_to_int32(databytes, ptr + 12), 22)
                    updateRun(fF(b, c, d), 0xf57c0faf, bytes_to_int32(databytes, ptr + 16), 7)
                    updateRun(fF(b, c, d), 0x4787c62a, bytes_to_int32(databytes, ptr + 20), 12)
                    updateRun(fF(b, c, d), 0xa8304613, bytes_to_int32(databytes, ptr + 24), 17)
                    updateRun(fF(b, c, d), 0xfd469501, bytes_to_int32(databytes, ptr + 28), 22)
                    updateRun(fF(b, c, d), 0x698098d8, bytes_to_int32(databytes, ptr + 32), 7)
                    updateRun(fF(b, c, d), 0x8b44f7af, bytes_to_int32(databytes, ptr + 36), 12)
                    updateRun(fF(b, c, d), 0xffff5bb1, bytes_to_int32(databytes, ptr + 40), 17)
                    updateRun(fF(b, c, d), 0x895cd7be, bytes_to_int32(databytes, ptr + 44), 22)
                    updateRun(fF(b, c, d), 0x6b901122, bytes_to_int32(databytes, ptr + 48), 7)
                    updateRun(fF(b, c, d), 0xfd987193, bytes_to_int32(databytes, ptr + 52), 12)
                    updateRun(fF(b, c, d), 0xa679438e, bytes_to_int32(databytes, ptr + 56), 17)
                    updateRun(fF(b, c, d), 0x49b40821, bytes_to_int32(databytes, ptr + 60), 22)
                    updateRun(fG(b, c, d), 0xf61e2562, bytes_to_int32(databytes, ptr + 4), 5)
                    updateRun(fG(b, c, d), 0xc040b340, bytes_to_int32(databytes, ptr + 24), 9)
                    updateRun(fG(b, c, d), 0x265e5a51, bytes_to_int32(databytes, ptr + 44), 14)
                    updateRun(fG(b, c, d), 0xe9b6c7aa, bytes_to_int32(databytes, ptr), 20)
                    updateRun(fG(b, c, d), 0xd62f105d, bytes_to_int32(databytes, ptr + 20), 5)
                    updateRun(fG(b, c, d), 0x2441453, bytes_to_int32(databytes, ptr + 40), 9)
                    updateRun(fG(b, c, d), 0xd8a1e681, bytes_to_int32(databytes, ptr + 60), 14)
                    updateRun(fG(b, c, d), 0xe7d3fbc8, bytes_to_int32(databytes, ptr + 16), 20)
                    updateRun(fG(b, c, d), 0x21e1cde6, bytes_to_int32(databytes, ptr + 36), 5)
                    updateRun(fG(b, c, d), 0xc33707d6, bytes_to_int32(databytes, ptr + 56), 9)
                    updateRun(fG(b, c, d), 0xf4d50d87, bytes_to_int32(databytes, ptr + 12), 14)
                    updateRun(fG(b, c, d), 0x455a14ed, bytes_to_int32(databytes, ptr + 32), 20)
                    updateRun(fG(b, c, d), 0xa9e3e905, bytes_to_int32(databytes, ptr + 52), 5)
                    updateRun(fG(b, c, d), 0xfcefa3f8, bytes_to_int32(databytes, ptr + 8), 9)
                    updateRun(fG(b, c, d), 0x676f02d9, bytes_to_int32(databytes, ptr + 28), 14)
                    updateRun(fG(b, c, d), 0x8d2a4c8a, bytes_to_int32(databytes, ptr + 48), 20)
                    updateRun(fH(b, c, d), 0xfffa3942, bytes_to_int32(databytes, ptr + 20), 4)
                    updateRun(fH(b, c, d), 0x8771f681, bytes_to_int32(databytes, ptr + 32), 11)
                    updateRun(fH(b, c, d), 0x6d9d6122, bytes_to_int32(databytes, ptr + 44), 16)
                    updateRun(fH(b, c, d), 0xfde5380c, bytes_to_int32(databytes, ptr + 56), 23)
                    updateRun(fH(b, c, d), 0xa4beea44, bytes_to_int32(databytes, ptr + 4), 4)
                    updateRun(fH(b, c, d), 0x4bdecfa9, bytes_to_int32(databytes, ptr + 16), 11)
                    updateRun(fH(b, c, d), 0xf6bb4b60, bytes_to_int32(databytes, ptr + 28), 16)
                    updateRun(fH(b, c, d), 0xbebfbc70, bytes_to_int32(databytes, ptr + 40), 23)
                    updateRun(fH(b, c, d), 0x289b7ec6, bytes_to_int32(databytes, ptr + 52), 4)
                    updateRun(fH(b, c, d), 0xeaa127fa, bytes_to_int32(databytes, ptr), 11)
                    updateRun(fH(b, c, d), 0xd4ef3085, bytes_to_int32(databytes, ptr + 12), 16)
                    updateRun(fH(b, c, d), 0x4881d05, bytes_to_int32(databytes, ptr + 24), 23)
                    updateRun(fH(b, c, d), 0xd9d4d039, bytes_to_int32(databytes, ptr + 36), 4)
                    updateRun(fH(b, c, d), 0xe6db99e5, bytes_to_int32(databytes, ptr + 48), 11)
                    updateRun(fH(b, c, d), 0x1fa27cf8, bytes_to_int32(databytes, ptr + 60), 16)
                    updateRun(fH(b, c, d), 0xc4ac5665, bytes_to_int32(databytes, ptr + 8), 23)
                    updateRun(fI(b, c, d), 0xf4292244, bytes_to_int32(databytes, ptr), 6)
                    updateRun(fI(b, c, d), 0x432aff97, bytes_to_int32(databytes, ptr + 28), 10)
                    updateRun(fI(b, c, d), 0xab9423a7, bytes_to_int32(databytes, ptr + 56), 15)
                    updateRun(fI(b, c, d), 0xfc93a039, bytes_to_int32(databytes, ptr + 20), 21)
                    updateRun(fI(b, c, d), 0x655b59c3, bytes_to_int32(databytes, ptr + 48), 6)
                    updateRun(fI(b, c, d), 0x8f0ccc92, bytes_to_int32(databytes, ptr + 12), 10)
                    updateRun(fI(b, c, d), 0xffeff47d, bytes_to_int32(databytes, ptr + 40), 15)
                    updateRun(fI(b, c, d), 0x85845dd1, bytes_to_int32(databytes, ptr + 4), 21)
                    updateRun(fI(b, c, d), 0x6fa87e4f, bytes_to_int32(databytes, ptr + 32), 6)
                    updateRun(fI(b, c, d), 0xfe2ce6e0, bytes_to_int32(databytes, ptr + 60), 10)
                    updateRun(fI(b, c, d), 0xa3014314, bytes_to_int32(databytes, ptr + 24), 15)
                    updateRun(fI(b, c, d), 0x4e0811a1, bytes_to_int32(databytes, ptr + 52), 21)
                    updateRun(fI(b, c, d), 0xf7537e82, bytes_to_int32(databytes, ptr + 16), 6)
                    updateRun(fI(b, c, d), 0xbd3af235, bytes_to_int32(databytes, ptr + 44), 10)
                    updateRun(fI(b, c, d), 0x2ad7d2bb, bytes_to_int32(databytes, ptr + 8), 15)
                    updateRun(fI(b, c, d), 0xeb86d391, bytes_to_int32(databytes, ptr + 36), 21)
                        // update buffers
                    h0 = _add(h0, a)
                    h1 = _add(h1, b)
                    h2 = _add(h2, c)
                    h3 = _add(h3, d)
                }
                // Done! Convert buffers to 128 bit (LE)
                return int128le_to_hex(h3, h2, h1, h0).toUpperCase()
            }
        }
    };

    var support = function() {
        return !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
    };

    $.touchSupport = support;

    $.touchEvents = {
        start: support() ? 'touchstart' : 'mousedown',
        move: support() ? 'touchmove' : 'mousemove',
        end: support() ? 'touchend' : 'mouseup'
    };

    xframework.Self.prototype = $.fn;
    xframework.uniq = uniq;
    $.xframework = xframework;
    return $;
}.call(this));

window.Xframework = Xframework;
window.$ === undefined && (window.$ = Xframework);
