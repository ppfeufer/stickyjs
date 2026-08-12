/* global define */

/*!
 * Sticky Plugin for jQuery (modernized fork by Peter Pfeufer)
 *
 * @version 0.0.2
 * @author Peter Pfeufer
 * @license GPL-3.0 or later
 * @link https://github.com/ppfeufer/stickyjs
 *
 * Description: Makes an element on the page stick on the screen as you scroll.
 *              It will only set the 'top' and 'position' of your element,
 *              you might need to adjust the width in some cases.
 *
 * Original Plugin:
 * Author: Anthony Garand
 * Improvements by:
 *      German M. Bravo (Kronuz)
 *      Ruud Kamphuis (ruudk)
 *      Leonardo C. Daronco (daronco)
 * Created: 02/14/2011
 * GitHub: https://github.com/garand/sticky
 */

(function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) { // jshint ignore:line
        // Node/CommonJS
        module.exports = factory(require('jquery')); // jshint ignore:line
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function($) {
    'use strict';

    const splice = Array.prototype.splice; // save ref to original slice()

    let defaults = {
        topSpacing: 0,
        bottomSpacing: 0,
        className: 'is-sticky',
        wrapperClassName: 'sticky-wrapper',
        center: false,
        getWidthFrom: '',
        widthFromWrapper: true, // works only when .getWidthFrom is empty
        responsiveWidth: false,
        zIndex: 'inherit'
    };
    const $window = $(window);
    const $document = $(document);
    const sticked = [];
    let windowHeight = $window.height();

    const scroller = function () {
        const scrollTop = $window.scrollTop();
        const documentHeight = $document.height();
        const dwh = documentHeight - windowHeight;
        const extra = (scrollTop > dwh) ? dwh - scrollTop : 0;

        let i = 0, l = sticked.length;

        for (; i < l; i++) {
            const s = sticked[i];
            const elementTop = s.stickyWrapper.offset().top;
            const etse = elementTop - s.topSpacing - extra;

            //update height in case of dynamic content
            s.stickyWrapper.css('height', s.stickyElement.outerHeight());

            if (scrollTop <= etse) {
                if (s.currentTop !== null) {
                    s.stickyElement
                        .css({
                            'width': '',
                            'position': '',
                            'top': '',
                            'z-index': ''
                        });
                    s.stickyElement.parent().removeClass(s.className);
                    s.stickyElement.trigger('sticky-end', [s]);
                    s.currentTop = null;
                }
            } else {
                let newTop = documentHeight - s.stickyElement.outerHeight() - s.topSpacing - s.bottomSpacing - scrollTop - extra;

                if (newTop < 0) {
                    newTop = newTop + s.topSpacing;
                } else {
                    newTop = s.topSpacing;
                }

                if (s.currentTop !== newTop) {
                    let newWidth;

                    if (s.getWidthFrom) {
                        const padding = s.stickyElement.innerWidth() - s.stickyElement.width();

                        newWidth = $(s.getWidthFrom).width() - padding || null;
                    } else if (s.widthFromWrapper) {
                        newWidth = s.stickyWrapper.width();
                    }

                    if (newWidth === null) {
                        newWidth = s.stickyElement.width();
                    }

                    s.stickyElement
                        .css('width', newWidth)
                        .css('position', 'fixed')
                        .css('top', newTop)
                        .css('z-index', s.zIndex);

                    s.stickyElement.parent().addClass(s.className);

                    if (s.currentTop === null) {
                        s.stickyElement.trigger('sticky-start', [s]);
                    } else {
                        // sticky is started but it has to be repositioned
                        s.stickyElement.trigger('sticky-update', [s]);
                    }

                    if (s.currentTop === s.topSpacing && s.currentTop > newTop || s.currentTop === null && newTop < s.topSpacing) {
                        // just reached bottom || just started to stick but bottom is already reached
                        s.stickyElement.trigger('sticky-bottom-reached', [s]);
                    } else if (s.currentTop !== null && newTop === s.topSpacing && s.currentTop < newTop) {
                        // sticky is started && sticked at topSpacing && overflowing from top just finished
                        s.stickyElement.trigger('sticky-bottom-unreached', [s]);
                    }

                    s.currentTop = newTop;
                }

                // Check if sticky has reached end of container and stop sticking
                const stickyWrapperContainer = s.stickyWrapper.parent();
                const unstick = (s.stickyElement.offset().top + s.stickyElement.outerHeight() >= stickyWrapperContainer.offset().top + stickyWrapperContainer.outerHeight()) && (s.stickyElement.offset().top <= s.topSpacing);

                if (unstick) {
                    s.stickyElement
                        .css('position', 'absolute')
                        .css('top', '')
                        .css('bottom', 0)
                        .css('z-index', '');
                } else {
                    s.stickyElement
                        .css('position', 'fixed')
                        .css('top', newTop)
                        .css('bottom', '')
                        .css('z-index', s.zIndex);
                }
            }
        }
    };

    const resizer = function () {
        windowHeight = $window.height();

        let i = 0, l = sticked.length;

        for (; i < l; i++) {
            const s = sticked[i];
            let newWidth = null;

            if (s.getWidthFrom) {
                if (s.responsiveWidth) {
                    newWidth = $(s.getWidthFrom).width();
                }
            } else if (s.widthFromWrapper) {
                newWidth = s.stickyWrapper.width();
            }

            if (newWidth !== null) {
                s.stickyElement.css('width', newWidth);
            }
        }
    };

    const setWrapperHeight = (stickyElement) => {
        const element = $(stickyElement);
        const stickyWrapper = element.parent();

        if (stickyWrapper) {
            stickyWrapper.css('height', element.outerHeight());
        }
    };

    const clearStickyStyles = (stickyElement, styles) => {
        $(stickyElement).css(styles);
    };

    const setupChangeListeners = (stickyElement) => {
        if (window.MutationObserver) {
            const mutationObserver = new window.MutationObserver((mutations) => {
                if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
                    setWrapperHeight(stickyElement);
                }
            });

            mutationObserver.observe(stickyElement, {
                subtree: true,
                childList: true
            });
        } else {
            stickyElement.addEventListener('DOMNodeInserted', () => {
                setWrapperHeight(stickyElement);
            }, false);

            stickyElement.addEventListener('DOMNodeRemoved', () => {
                setWrapperHeight(stickyElement);
            }, false);
        }
    };

    const methods = {
        init: ($elements, options) => {
            return $elements.each((index, element) => {
                void index;
                const o = $.extend({}, defaults, options);
                const stickyElement = $(element);

                const stickyId = stickyElement.attr('id');
                const wrapperId = stickyId ? stickyId + '-' + defaults.wrapperClassName : defaults.wrapperClassName;
                const wrapper = $('<div></div>')
                    .attr('id', wrapperId)
                    .addClass(o.wrapperClassName);

                stickyElement.wrapAll(() => {
                    if (stickyElement.parent('#' + wrapperId).length === 0) {
                        return wrapper;
                    }
                });

                const stickyWrapper = stickyElement.parent();

                if (o.center) {
                    stickyWrapper.css({
                        width: stickyElement.outerWidth(),
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    });
                }

                if (stickyElement.css('float') === 'right') {
                    stickyElement.css({'float': 'none'}).parent().css({'float': 'right'});
                }

                o.stickyElement = stickyElement;
                o.stickyWrapper = stickyWrapper;
                o.currentTop = null;

                sticked.push(o);

                setWrapperHeight(element);
                setupChangeListeners(element);
            });
        },
        // setWrapperHeight,
        // setupChangeListeners,
        update: scroller,
        unstick: ($elements) => {
            return $elements.each((index, element) => {
                void index;
                const unstickyElement = $(element);

                let removeIdx = -1;
                let i = sticked.length;

                while (i-- > 0) {
                    if (sticked[i].stickyElement.get(0) === element) {
                        splice.call(sticked, i, 1);
                        removeIdx = i;
                    }
                }

                if (removeIdx !== -1) {
                    unstickyElement.unwrap();
                    clearStickyStyles(unstickyElement, {
                        'width': '',
                        'position': '',
                        'top': '',
                        'float': '',
                        'z-index': ''
                    });
                }
            });
        }
    };

    const createMethodInvoker = (fallbackMethod) => ($elements, method, ...args) => {
        if (methods[method]) {
            return methods[method].apply($elements, args);
        } else if (typeof method === 'object' || !method) {
            return fallbackMethod($elements, method, ...args);
        }

        $.error('Method ' + method + ' does not exist on jQuery.sticky');
    };

    const invokeStickyMethod = createMethodInvoker(($elements, method) => methods.init($elements, method));
    const invokeUnstickMethod = createMethodInvoker(($elements) => methods.unstick($elements));

    // should be more efficient than using $window.scroll(scroller) and $window.resize(resizer):
    if (window.addEventListener) {
        window.addEventListener('scroll', scroller, false);
        window.addEventListener('resize', resizer, false);
    } else if (window.attachEvent) {
        window.attachEvent('onscroll', scroller);
        window.attachEvent('onresize', resizer);
    }

    Object.defineProperty($.fn, 'sticky', {
        configurable: true,
        get() {
            const $elements = this;

            return (method, ...args) => invokeStickyMethod($elements, method, ...args);
        }
    });

    Object.defineProperty($.fn, 'unstick', {
        configurable: true,
        get() {
            const $elements = this;

            return (method, ...args) => invokeUnstickMethod($elements, method, ...args);
        }
    });

    $(() => {
        setTimeout(scroller, 0);
    });
}));
