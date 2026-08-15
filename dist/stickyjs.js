/* global define */

/*!
 * Sticky Plugin for jQuery (modernized fork by Peter Pfeufer)
 *
 * @version 0.1.0
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
 *      German M. Bravo (@Kronuz)
 *      Ruud Kamphuis (@ruudk)
 *      Leonardo C. Daronco (@daronco)
 * Created: 02/14/2011
 * GitHub: https://github.com/garand/sticky
 */

((factory) => {
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
})($ => {
    'use strict';

    const splice = Array.prototype.splice; // save ref to original slice()

    let defaults = {
        topSpacing: 0,
        bottomSpacing: 0,
        className: 'is-sticky',
        wrapperClassName: 'sticky-wrapper',
        center: false,
        getWidthFrom: null,
        widthFromWrapper: true, // works only when .getWidthFrom is empty
        responsiveWidth: false,
        zIndex: 'inherit',
        scrollStickyElement: false,
        callback: {
            onStick: null,
            onUnstick: null
        }
    };
    const $window = $(window);
    const $document = $(document);
    const sticked = [];
    let windowHeight = $window.height();
    let lastScroll = $window.scrollTop();
    let stickyOffset = 0;

    /**
     * Scroll handler that updates the position of sticky elements based on the current scroll position.
     */
    const scroller = () => {
        const scrollTop = $window.scrollTop();
        const documentHeight = $document.height();
        const dwh = documentHeight - windowHeight;
        const extra = (scrollTop > dwh) ? dwh - scrollTop : 0;

        let i = 0;
        let l = sticked.length;

        for (; i < l; i++) {
            const s = sticked[i];
            const elementTop = s.stickyWrapper.offset().top;
            const elementTopSpacingExtra = Math.max(0, elementTop - s.topSpacing - extra);

            // Update height in case of dynamic content
            s.stickyWrapper.css({height: s.stickyElement.outerHeight()});

            if (scrollTop <= elementTopSpacingExtra) {
                if (s.currentTop !== null) {
                    s.stickyElement
                        .css({
                            width: '',
                            position: '',
                            top: '',
                            zIndex: ''
                        });
                    s.stickyElement.parent().removeClass(s.className);
                    s.stickyElement.trigger('sticky-end', [s]);
                    s.currentTop = null;

                    // Fire the onUnstick callback if it exists
                    if (s.callback.onUnstick) {
                        s.callback.onUnstick(s.stickyElement);
                    }
                }
            } else {
                let newTop = documentHeight - s.stickyElement.outerHeight() - s.topSpacing - s.bottomSpacing - scrollTop - extra;

                if (newTop < 0) {
                    newTop = newTop + s.topSpacing;
                } else {
                    newTop = s.topSpacing;
                }

                if (s.scrollStickyElement) {
                    // Also scroll the sticky element if it's higher from window
                    if (s.stickyElement.outerHeight() > windowHeight) {
                        const scrollDiff = scrollTop - lastScroll;
                        const newStickyOffset = stickyOffset - scrollDiff;

                        if (scrollDiff > 0) {
                            // Down
                            if ((s.stickyElement.outerHeight() + stickyOffset) > windowHeight) {
                                stickyOffset = newStickyOffset;

                                if (stickyOffset < (windowHeight - s.stickyElement.outerHeight())) {
                                    stickyOffset = windowHeight - s.stickyElement.outerHeight();
                                }
                            }

                            newTop = stickyOffset;
                        } else if (s.currentTop < 0) {
                            // Up
                            newTop = stickyOffset = newStickyOffset;
                        } else {
                            newTop = 0;
                        }
                    }
                }

                lastScroll = scrollTop;

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
                        .css({
                            width: newWidth,
                            position: 'fixed',
                            top: newTop,
                            zIndex: s.zIndex
                        });


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

                    // Fire the onStick callback if it exists
                    if (s.callback.onStick) {
                        s.callback.onStick(s.stickyElement);
                    }
                }

                // Check if sticky has reached end of container and stop sticking
                const stickyWrapperContainer = s.stickyWrapper.parent();
                const unstick = (
                    (s.stickyElement.offset().top + s.stickyElement.outerHeight() >= stickyWrapperContainer.offset().top + stickyWrapperContainer.outerHeight())
                    && (s.stickyElement.offset().top <= s.topSpacing) // jshint ignore:line
                );

                if (unstick) {
                    s.stickyElement
                        .css({
                            position: 'absolute',
                            top: '',
                            bottom: 0,
                            zIndex: ''
                        });
                } else {
                    s.stickyElement
                        .css({
                            position: 'fixed',
                            top: newTop,
                            bottom: '',
                            zIndex: s.zIndex
                        });
                }
            }
        }
    };

    /**
     * Resize handler that updates the width of sticky elements based on the current window size.
     */
    const resizer = () => {
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
                s.stickyElement.css({width: newWidth});
            }
        }
    };

    /**
     * Sets the height of the sticky wrapper to match the height of the sticky element.
     *
     * @param {HTMLElement} stickyElement - The sticky element for which the wrapper height should be set.
     */
    const setWrapperHeight = (stickyElement) => {
        const element = $(stickyElement);
        const stickyWrapper = element.parent();

        if (stickyWrapper) {
            stickyWrapper.css({height: element.outerHeight()});
        }
    };

    /**
     * Clears the sticky styles applied to the sticky element.
     *
     * @param {HTMLElement} stickyElement - The sticky element from which the styles should be cleared.
     * @param {Object} styles - An object containing the CSS styles to be cleared.
     */
    const clearStickyStyles = (stickyElement, styles) => {
        $(stickyElement).css(styles);
    };

    /**
     * Generates a unique identifier string.
     *
     * @returns {`${string}-${string}-${string}-${string}-${string}`|string}
     */
    const createUniqueId = () => {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    /**
     * Sets up listeners for changes in the DOM of the sticky element, and updates the wrapper height accordingly.
     *
     * @param {HTMLElement} stickyElement - The sticky element for which to set up change listeners.
     */
    const setupChangeListeners = (stickyElement) => {
        if (window.MutationObserver) {
            /**
             * Creates a new MutationObserver to watch for changes in the DOM of the sticky element.
             *
             * @param {MutationRecord[]} mutations - An array of MutationRecord objects representing the changes observed.
             * @type {MutationObserver}
             */
            const mutationObserver = new window.MutationObserver((mutations) => {
                if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
                    setWrapperHeight(stickyElement);
                }
            });

            mutationObserver.observe(stickyElement, {
                subtree: true,
                childList: true
            });

            $(stickyElement).data('sticky.mutationObserver', mutationObserver);
        } else {
            stickyElement.addEventListener('DOMNodeInserted', () => {
                setWrapperHeight(stickyElement);
            }, false);

            stickyElement.addEventListener('DOMNodeRemoved', () => {
                setWrapperHeight(stickyElement);
            }, false);
        }
    };

    /**
     * An object containing methods for initializing, updating, and unsticking sticky elements.
     *
     * @type {{init: function(*, *): *, update: resizer, unstick: function(*): *}}
     */
    const methods = {
        // Initializes the sticky behavior for the selected elements.
        init: ($elements, options) => {
            return $elements.each((index, element) => {
                void index;

                const o = $.extend({}, defaults, options);
                const stickyElement = $(element);

                const wrapperIdBase = 'sticky-wrapper';
                const wrapperId = `${wrapperIdBase}-${createUniqueId()}`;
                const wrapper = $('<div></div>')
                    .attr('id', wrapperId)
                    .addClass(o.wrapperClassName);

                // Avoid nested wrappers when sticky() is called again on the same element.
                if (!stickyElement.parent().hasClass(o.wrapperClassName)) {
                    stickyElement.wrapAll(() => wrapper);
                }

                const stickyWrapper = stickyElement.parent();

                if (!stickyWrapper.attr('id')) {
                    stickyWrapper.attr('id', wrapperId);
                }

                if (o.center) {
                    stickyWrapper.css({
                        width: stickyElement.outerWidth(),
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    });
                }

                if (stickyElement.css('float') === 'right') {
                    stickyElement.css({float: 'none'}).parent().css({float: 'right'});
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
        // Updates the width of sticky elements based on the current window size.
        update: resizer,
        // Unsticks the selected elements, removing their sticky behavior.
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
                    const mutationObserver = $(unstickyElement).data('sticky.mutationObserver');
                    mutationObserver.disconnect();

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

    /**
     * Creates a method invoker function that calls the appropriate method from the `methods` object based on the provided method name.
     *
     * @param {function} fallbackMethod - The fallback method to call if the specified method does not exist.
     * @returns {(function(*, *, ...[*]): (*|undefined))|*}
     */
    const createMethodInvoker = (fallbackMethod) => ($elements, method, ...args) => {
        if (methods[method]) {
            return methods[method].apply($elements, args);
        } else if (typeof method === 'object' || !method) {
            return fallbackMethod($elements, method, ...args);
        }

        $.error(`Method ${method} does not exist on jQuery.sticky`);
    };

    const invokeStickyMethod = createMethodInvoker(($elements, method) => methods.init($elements, method));
    const invokeUnstickMethod = createMethodInvoker(($elements) => methods.unstick($elements));

    // Should be more efficient than using $window.scroll(scroller) and $window.resize(resizer):
    if (window.addEventListener) {
        window.addEventListener('scroll', scroller, false);
        window.addEventListener('resize', resizer, false);
    } else if (window.attachEvent) {
        window.attachEvent('onscroll', scroller);
        window.attachEvent('onresize', resizer);
    }

    // Stick the selected elements.
    Object.defineProperty($.fn, 'sticky', {
        configurable: true,
        get () {
            const $elements = this;

            /**
             * Creates a method invoker for the sticky functionality, allowing users to call methods on the sticky elements.
             *
             * @param {string|Object} method - The name of the method to invoke or an object containing options for initialization.
             * @param {...*} args - Additional arguments to pass to the method.
             * @returns {*|undefined}
             */
            return (method, ...args) => invokeStickyMethod($elements, method, ...args);
        }
    });

    // Unstick the selected elements.
    Object.defineProperty($.fn, 'unstick', {
        configurable: true,
        get () {
            const $elements = this;

            /**
             * Creates a method invoker for the unstick functionality, allowing users to call methods on the unstick elements.
             *
             * @param {string|Object} method - The name of the method to invoke or an object containing options for initialization.
             * @param {...*} args - Additional arguments to pass to the method.
             * @returns {*|undefined}
             */
            return (method, ...args) => invokeUnstickMethod($elements, method, ...args);
        }
    });

    // Initialize the scroller function on document ready to ensure that sticky elements are positioned correctly.
    $(() => {
        setTimeout(scroller, 0);
    });
});
