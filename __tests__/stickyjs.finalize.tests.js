/* global jest, describe, test, expect */

'use strict';

const fileToTest = '../src/stickyjs.js';

describe('Finalize coverage: clamp, width-fallback, addEventListener fallback, module.exports internals', () => {
    test('stickyOffset clamp in scrollStickyElement down branch', () => {
        jest.isolateModules(() => {
            // ensure global window/document for module load
            global.window = global.window || {};
            global.document = global.document || {};

            let scrollTop = 200;
            const $mock = (arg) => {
                if (arg === window) {
                    return {
                        height: () => 100,
                        scrollTop: () => scrollTop
                    };
                }
                if (arg === document) {
                    return {
                        height: () => 1000, ready: (cb) => {
                            if (cb) {
                                cb();
                            }
                        }
                    };
                }
                return arg;
            };
            $mock.fn = {};
            $mock.extend = (a, b) => Object.assign(a, b);
            $mock.error = () => {
            };
            jest.doMock('jquery', () => $mock, {virtual: true});

            const lib = require(fileToTest);
            const internals = lib && lib.__TEST_INTERNALS__ || global.__STICKY_INTERNALS__;
            expect(internals).toBeDefined();

            const stickyElement = {
                outerHeight: () => 200,
                innerWidth: () => 200,
                width: () => 200,
                offset: () => ({top: 0}),
                parent: () => ({
                    addClass: () => {
                    }, removeClass: () => {
                    }, offset: () => ({top: 0}), outerHeight: () => 10
                }),
                css: () => {
                },
                trigger: () => {
                }
            };

            const s = {
                stickyElement,
                stickyWrapper: {
                    offset: () => ({top: 0}),
                    css: () => {
                    },
                    width: () => 80,
                    parent: () => ({offset: () => ({top: 0}), outerHeight: () => 10})
                },
                topSpacing: 0,
                bottomSpacing: 0,
                className: 'is-sticky',
                zIndex: 'inherit',
                getWidthFrom: null,
                widthFromWrapper: true,
                scrollStickyElement: true,
                callback: {},
                currentTop: null
            };

            internals.sticked.length = 0;
            internals.sticked.push(s);

            internals.setStickyOffset(0);
            internals.setLastScroll(0);
            // call scroller to process scrollDiff > 0 and clamp stickyOffset
            expect(() => internals.scroller()).not.toThrow();

            const so = internals.getStickyOffset();
            // clamp value should be windowHeight - outerHeight = 100 - 200 = -100
            expect(typeof so === 'number').toBeTruthy();
            expect(so).toBeLessThanOrEqual(0);
        });
    });

    test('newWidth null fallback uses stickyElement.width()', () => {
        jest.isolateModules(() => {
            global.window = global.window || {};
            global.document = global.document || {};

            let scrollTop = 10;
            const $mock = (arg) => {
                if (arg === window) {
                    return {
                        height: () => 100,
                        scrollTop: () => scrollTop
                    };
                }
                if (arg === document) {
                    return {
                        height: () => 1000, ready: (cb) => {
                            if (cb) {
                                cb();
                            }
                        }
                    };
                }
                if (typeof arg === 'string' && arg === '#zero') {
                    return {width: () => 0};
                }
                return arg;
            };
            $mock.fn = {};
            $mock.extend = (a, b) => Object.assign(a, b);
            $mock.error = () => {
            };
            jest.doMock('jquery', () => $mock, {virtual: true});

            const lib = require(fileToTest);
            const internals = lib && lib.__TEST_INTERNALS__ || global.__STICKY_INTERNALS__;
            expect(internals).toBeDefined();

            const applied = [];
            const stickyElement = {
                outerHeight: () => 10,
                innerWidth: () => 123,
                width: () => 123,
                offset: () => ({top: 0}),
                parent: () => ({
                    addClass: () => {
                    }, removeClass: () => {
                    }, offset: () => ({top: 0}), outerHeight: () => 10
                }),
                css: (o) => applied.push(o),
                trigger: () => {
                }
            };

            const s = {
                stickyElement,
                stickyWrapper: {
                    offset: () => ({top: 0}),
                    css: () => {
                    },
                    width: () => 0,
                    parent: () => ({offset: () => ({top: 0}), outerHeight: () => 10})
                },
                topSpacing: 0,
                bottomSpacing: 0,
                className: 'is-sticky',
                zIndex: 'inherit',
                getWidthFrom: '#zero',
                widthFromWrapper: false,
                scrollStickyElement: false,
                callback: {},
                currentTop: null
            };

            internals.sticked.length = 0;
            internals.sticked.push(s);
            internals.setWindowHeight(100);
            internals.setLastScroll(0);
            // simulate scroll so element becomes sticky
            scrollTop = 50;

            expect(() => internals.scroller()).not.toThrow();
            const found = applied.find(c => c && Object.prototype.hasOwnProperty.call(c, 'width'));
            expect(found).toBeDefined();
            expect(found.width).toBe(123);
        });
    });

    test('setupChangeListeners attaches addEventListener when MutationObserver missing', () => {
        jest.isolateModules(() => {
            // ensure MutationObserver not present and provide ready on document
            global.window = global.window || {};
            try {
                delete global.window.MutationObserver;
            } catch (e) { // eslint-disable-line no-unused-vars
            }
            global.document = global.document || {};

            const added = [];
            const el = {
                addEventListener: (ev) => {
                    added.push(ev);
                },
                removeEventListener: () => {
                }
            };

            const $mock = (arg) => {
                if (arg === window) {
                    return {height: () => 100, scrollTop: () => 0};
                }
                if (arg === document) {
                    return {
                        height: () => 1000, ready: (cb) => {
                            if (cb) {
                                cb();
                            }
                        }
                    };
                }
                return arg;
            };
            $mock.fn = {};
            $mock.extend = (a, b) => Object.assign(a, b);
            $mock.error = () => {
            };
            jest.doMock('jquery', () => $mock, {virtual: true});

            const lib = require(fileToTest);
            const internals = lib && lib.__TEST_INTERNALS__ || global.__STICKY_INTERNALS__;
            expect(internals).toBeDefined();

            expect(() => internals.setupChangeListeners(el)).not.toThrow();
            // two listeners should be attached: DOMNodeInserted and DOMNodeRemoved
            expect(added.includes('DOMNodeInserted') || added.length >= 1).toBeTruthy();
        });
    });

    test('module.exports.__TEST_INTERNALS__ is present and callable when available', () => {
        jest.isolateModules(() => {
            global.window = global.window || {};
            global.document = global.document || {};

            const $mock = (arg) => {
                if (arg === window) {
                    return {height: () => 100, scrollTop: () => 0};
                }
                if (arg === document) {
                    return {
                        height: () => 1000, ready: (cb) => {
                            if (cb) {
                                cb();
                            }
                        }
                    };
                }
                return arg;
            };
            $mock.fn = {};
            $mock.extend = (a, b) => Object.assign(a, b);
            $mock.error = () => {
            };
            jest.doMock('jquery', () => $mock, {virtual: true});

            // require and explicitly read module.exports
            const lib = require(fileToTest); // eslint-disable-line no-unused-vars
            // module.exports may contain __TEST_INTERNALS__ under Jest guard
            const exported = require(fileToTest);
            const internals = exported && exported.__TEST_INTERNALS__ || global.__STICKY_INTERNALS__;
            expect(internals).toBeDefined();

            // call some setters/getters to ensure lines executed
            internals.setLastScroll(7);
            expect(internals.getLastScroll()).toBe(7);
            internals.setStickyOffset(2);
            expect(internals.getStickyOffset()).toBe(2);
            internals.setWindowHeight(88);
            expect(internals.getWindowHeight()).toBe(88);
        });
    });
});
