(function($) {
    'use strict';

    $.rippleOpts = null;

    $.fn.initRipple = function(options) {
        var defaults = {
            materialRipple: true,
            material: $.detect.os.android,
            activeState: true,
            activeStateElements: 'a, button, label, span',
            materialRippleElements: '.toolbar a,.ripple, a.link, a.item-link, .button, .tab-link, .label-radio, .label-checkbox, a.floating-button, .floating-button > a',
            clickDistanceThreshold: 10
        };

        var touchStartX, touchStartY, touchStartTime, targetElement, trackClick, isMoved;
        var rippleWave, rippleTarget, rippleTransform, rippleTimeout;

        $.rippleOpts = $.extend(true, defaults, options);
        if ($.detect.os.ios && $.detect.browser.webView) {
            window.addEventListener('touchstart', function() {});
        }

        function findActivableElement(el) {
            var target = $(el);
            var parents = target.parents($.rippleOpts.activeStateElements);
            var activable;
            if (target.is($.rippleOpts.activeStateElements)) {
                activable = target;
            }
            if (parents.length > 0) {
                activable = activable ? activable.add(parents) : parents;
            }
            return activable ? activable : target;
        }

        function isInsideScrollableView(el) {
            var pageContent = el.parents('.content');
            if (pageContent.length === 0) {
                return false;
            }
            return true;
        }

        function handleTouchStart(e) {
            targetElement = e.target;
            touchStartX = e.targetTouches[0].pageX;
            touchStartY = e.targetTouches[0].pageY;
            if ($.rippleOpts.material && $.rippleOpts.materialRipple) {
                rippleTouchStart(targetElement, touchStartX, touchStartY);
            }
        }

        function handleTouchMove(e) {
            if (!trackClick) return;
            var _isMoved = false;
            var distance = $.rippleOpts.distanceThreshold;
            if (distance) {
                var pageX = e.targetTouches[0].pageX;
                var pageY = e.targetTouches[0].pageY;
                if (Math.abs(pageX - touchStartX) > distance || Math.abs(pageY - touchStartY) > distance) {
                    _isMoved = true;
                }
            } else {
                _isMoved = true;
            }
            if (_isMoved) {
                trackClick = false;
                targetElement = null;
                isMoved = true;
                if ($.rippleOpts.material && $.rippleOpts.materialRipple) {
                    rippleTouchMove();
                }
            }
        }

        function handleTouchEnd(e) {
            e.preventDefault();
            if ($.rippleOpts.material && $.rippleOpts.materialRipple) {
                rippleTouchEnd();
            }
            return false;
        }

        function handleTouchCancel(e) {
            targetElement = null;
            if ($.rippleOpts.material && $.rippleOpts.materialRipple) {
                rippleTouchEnd();
            }
        }

        function handleMouseUp(e) {
            if ($.rippleOpts.materialRipple) {
                rippleTouchEnd();
            }
        }

        function handleMouseMove(e) {
            if ($.rippleOpts.materialRipple) {
                rippleTouchMove();
            }
        }

        function handleMouseDown(e) {
            if ($.rippleOpts.materialRipple) {
                touchStartX = e.pageX;
                touchStartY = e.pageY;
                rippleTouchStart(e.target, e.pageX, e.pageY);
            }
        }

        function rippleTouchStart(el, x, y) {
            rippleTarget = findRippleElement(el);
            if (!rippleTarget || rippleTarget.length === 0) {
                rippleTarget = undefined;
                return;
            }
            if (!isInsideScrollableView(rippleTarget)) {
                createRipple(touchStartX, touchStartY, rippleTarget);
            } else {
                rippleTimeout = setTimeout(function() {
                    createRipple(touchStartX, touchStartY, rippleTarget);
                }, 80);
            }
        }

        function rippleTouchMove() {
            clearTimeout(rippleTimeout);
            removeRipple();
        }

        function rippleTouchEnd() {
            if (rippleWave) {
                removeRipple();
            } else if (rippleTarget && !isMoved) {
                clearTimeout(rippleTimeout);
                createRipple(touchStartX, touchStartY, rippleTarget);
                setTimeout(removeRipple, 0);
            } else {
                removeRipple();
            }
        }

        function findRippleElement(el) {
            var needsRipple = $.rippleOpts.materialRippleElements;
            var $el = $(el);
            if ($el.is(needsRipple)) {
                if ($el.hasClass('no-ripple')) {
                    return false;
                }
                return $el;
            } else if ($el.parents(needsRipple).length > 0) {
                var rippleParent = $el.parents(needsRipple).eq(0);
                if (rippleParent.hasClass('no-ripple')) {
                    return false;
                }
                return rippleParent;
            } else {
                return false;
            }
        }

        function createRipple(x, y, el) {
            var box = el[0].getBoundingClientRect();
            var center = {
                    x: x - box.left,
                    y: y - box.top
                },
                height = box.height,
                width = box.width;
            var diameter = Math.max(Math.pow((Math.pow(height, 2) + Math.pow(width, 2)), 0.5), 48);
            rippleWave = $(
                '<div class="ripple-wave" style="width: ' + diameter + 'px; height: ' + diameter + 'px; margin-top:-' + diameter / 2 + 'px; margin-left:-' + diameter / 2 + 'px; left:' + center.x + 'px; top:' + center.y + 'px;"></div>'
            );
            el.prepend(rippleWave);
            var clientLeft = rippleWave[0].clientLeft;
            rippleTransform = 'translate3d(' + (-center.x + width / 2) + 'px, ' + (-center.y + height / 2) + 'px, 0) scale(1)';
            rippleWave.transform(rippleTransform);
        }

        function removeRipple() {
            if (!rippleWave) return;
            var toRemove = rippleWave;
            var removeTimeout = setTimeout(function() {
                toRemove.remove();
            }, 400);
            rippleWave
                .addClass('ripple-wave-fill')
                .transform(rippleTransform.replace('scale(1)', 'scale(1.01)'))
                .transitionEnd(function() {
                    clearTimeout(removeTimeout);
                    var rippleWave = $(this)
                        .addClass('ripple-wave-out')
                        .transform(rippleTransform.replace('scale(1)', 'scale(1.01)'));
                    removeTimeout = setTimeout(function() {
                        rippleWave.remove();
                    }, 700);
                    setTimeout(function() {
                        rippleWave.transitionEnd(function() {
                            clearTimeout(removeTimeout);
                            $(this).remove();
                        });
                    }, 0);
                });
            rippleWave = rippleTarget = undefined;
        }

        if ($.touchSupport()) {
            document.addEventListener('touchstart', handleTouchStart);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('touchcancel', handleTouchCancel);
        } else {
            document.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

}.call(this, Xframework));
