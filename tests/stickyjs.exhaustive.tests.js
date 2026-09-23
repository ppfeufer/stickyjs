/* global jest, describe, test, expect */

'use strict';

const fileToTest = '../src/stickyjs.js';

describe('Exhaustive internals exercises for stickyjs', () => {
    test('scrollStickyElement downward and upward branches adjust stickyOffset', () => {
        jest.isolateModules(() => {
            // mutable window/document state for the mock
            let scrollTop = 0;
            let docHeight = 2000;
            const windowHeight = 100;

            // ensure globals exist so module top-level references to `window`/`document` don't throw
            global.window = global.window || {};
            global.document = global.document || {};

            const $mock = (arg) => {
                if (arg === window) {
                    return {
                        height: () => windowHeight,
                        scrollTop: () => scrollTop,
                        addEventListener: () => {
                        }
                    };
                }

                if (arg === document) {
                    return {
                        height: () => docHeight, ready: (cb) => {
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

            // Build a sticky entry with outerHeight > windowHeight to trigger scrollStickyElement logic
            const applied = [];
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
                css: (obj) => applied.push(obj),
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

            // initial downward scroll
            internals.setStickyOffset(0);
            internals.setLastScroll(0);
            scrollTop = 50; // scroll down
            expect(() => internals.scroller()).not.toThrow();
            const offsetAfterDown = internals.getStickyOffset();
            // stickyOffset should have changed (likely negative)
            expect(typeof offsetAfterDown === 'number').toBeTruthy();

            // now simulate upward scroll where s.currentTop < 0 to hit the 'Up' branch
            internals.setLastScroll(100);
            // ensure currentTop negative
            s.currentTop = -10;
            scrollTop = 50; // scroll up
            const beforeUp = internals.getStickyOffset();
            expect(() => internals.scroller()).not.toThrow();
            const offsetAfterUp = internals.getStickyOffset();
            // offset should have been updated
            expect(offsetAfterUp).not.toBe(beforeUp);
        });
    });

    test('width fallbacks: widthFromWrapper and getWidthFrom zero fallback', () => {
        jest.isolateModules(() => {
            let scrollTop = 0;
            let docHeight = 1000;
            const windowHeight = 500;

            const selectorStore = {
                '#zero': {width: () => 0},
                '#source': {width: () => 250}
            };

            global.window = global.window || {};
            global.document = global.document || {};

            const $mock = (arg) => {
                if (arg === window) {
                    return {
                        height: () => windowHeight,
                        scrollTop: () => scrollTop,
                        addEventListener: () => {
                        }
                    };
                }
                if (arg === document) {
                    return {
                        height: () => docHeight, ready: (cb) => {
                            if (cb) {
                                cb();
                            }
                        }
                    };
                }
                if (typeof arg === 'string') {
                    return {width: () => (selectorStore[arg] ? selectorStore[arg].width() : 0)};
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
            const stickyElA = {
                outerHeight: () => 10,
                innerWidth: () => 110,
                width: () => 90,
                offset: () => ({top: 0}),
                parent: () => ({
                    addClass: () => {
                    }, removeClass: () => {
                    }, offset: () => ({top: 0}), outerHeight: () => 100
                }),
                css: (o) => applied.push(o),
                trigger: () => {
                }
            };
            const sA = {
                stickyElement: stickyElA,
                stickyWrapper: {
                    offset: () => ({top: 0}),
                    css: () => {
                    },
                    width: () => 80,
                    parent: () => ({offset: () => ({top: 0}), outerHeight: () => 100})
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

            const stickyElB = {
                outerHeight: () => 10,
                innerWidth: () => 100,
                width: () => 75,
                offset: () => ({top: 0}),
                parent: () => ({
                    addClass: () => {
                    }, removeClass: () => {
                    }, offset: () => ({top: 0}), outerHeight: () => 100
                }),
                css: (o) => applied.push(o),
                trigger: () => {
                }
            };
            const sB = {
                stickyElement: stickyElB,
                stickyWrapper: {
                    offset: () => ({top: 0}),
                    css: () => {
                    },
                    width: () => 66,
                    parent: () => ({offset: () => ({top: 0}), outerHeight: () => 100})
                },
                topSpacing: 0,
                bottomSpacing: 0,
                className: 'is-sticky',
                zIndex: 'inherit',
                getWidthFrom: null,
                widthFromWrapper: true,
                scrollStickyElement: false,
                callback: {},
                currentTop: null
            };

            internals.sticked.length = 0;
            internals.sticked.push(sA);
            internals.sticked.push(sB);

            internals.setWindowHeight(windowHeight);
            internals.setLastScroll(0);
            // ensure we are scrolled past wrapper top so scroller applies styles
            scrollTop = 10;

            expect(() => internals.scroller()).not.toThrow();
            // ensure at least one css call recorded
            expect(applied.length).toBeGreaterThanOrEqual(1);
        });
    });

    test('bottom reached callback triggers when newTop < topSpacing', () => {
        jest.isolateModules(() => {
            let scrollTop = 60;
            let docHeight = 150; // small so newTop becomes negative
            const windowHeight = 100;

            global.window = global.window || {};
            global.document = global.document || {};

            const $mock = (arg) => {
                if (arg === window) {
                    return {
                        height: () => windowHeight,
                        scrollTop: () => scrollTop,
                        addEventListener: () => {
                        }
                    };
                }
                if (arg === document) {
                    return {
                        height: () => docHeight, ready: (cb) => {
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

            let reached = 0;
            const stickyElement = {
                outerHeight: () => 100,
                innerWidth: () => 100,
                width: () => 100,
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
                    width: () => 10,
                    parent: () => ({offset: () => ({top: 0}), outerHeight: () => 10})
                },
                topSpacing: 10,
                bottomSpacing: 0,
                className: 'is-sticky',
                zIndex: 'inherit',
                getWidthFrom: null,
                widthFromWrapper: true,
                scrollStickyElement: false,
                callback: {
                    onBottomReached: () => {
                        reached++;
                    }
                },
                currentTop: 10
            };

            internals.sticked.length = 0;
            internals.sticked.push(s);
            internals.setWindowHeight(windowHeight);
            internals.setLastScroll(0);

            expect(() => internals.scroller()).not.toThrow();
            expect(reached).toBeGreaterThanOrEqual(1);
        });
    });
});
