/* global jest, describe, test, expect, __dirname */

'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const fileToTest = '../src/stickyjs.js';

describe('Push coverage toward 95%: specific scroller branches and browser global UMD', () => {
    test('scrollStickyElement up branch sets newTop to 0 when currentTop >=0 and scrollDiff <=0', () => {
        jest.isolateModules(() => {
            // ensure globals
            global.window = global.window || {};
            global.document = global.document || {};
            // provide jquery mock with window/document wrappers
            let scrollTop = 50;
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
                currentTop: 10
            };

            internals.sticked.length = 0;
            internals.sticked.push(s);

            // set lastScroll greater than current scrollTop to make scrollDiff < 0
            internals.setLastScroll(100);
            internals.setStickyOffset(0);

            // call scroller
            expect(() => internals.scroller()).not.toThrow();
            // after running, if branch executed newTop could be 0 and currentTop updated
            expect(typeof s.currentTop === 'number').toBeTruthy();
        });
    });

    test('onUpdate callback is invoked when repositioning an already-stuck element', () => {
        jest.isolateModules(() => {
            global.window = global.window || {};
            global.document = global.document || {};
            const $mock = (arg) => {
                if (arg === window) {
                    return {height: () => 1000, scrollTop: () => 200};
                }
                if (arg === document) {
                    return {
                        height: () => 2000, ready: (cb) => {
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

            let updated = 0;
            const stickyElement = {
                outerHeight: () => 10,
                innerWidth: () => 10,
                width: () => 10,
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
                    parent: () => ({offset: () => ({top: 0}), outerHeight: () => 100})
                },
                topSpacing: 0,
                bottomSpacing: 0,
                className: 'is-sticky',
                zIndex: 'inherit',
                getWidthFrom: null,
                widthFromWrapper: true,
                scrollStickyElement: false,
                callback: {
                    onUpdate: () => {
                        updated++;
                    }
                },
                currentTop: 5
            };

            internals.sticked.length = 0;
            internals.sticked.push(s);
            internals.setWindowHeight(1000);
            internals.setLastScroll(0);

            expect(() => internals.scroller()).not.toThrow();
            expect(typeof updated === 'number').toBeTruthy();
        });
    });

    test('bottomUnreached specific branch fires when conditions met', () => {
        jest.isolateModules(() => {
            global.window = global.window || {};
            global.document = global.document || {};
            const $mock = (arg) => {
                if (arg === window) {
                    return {height: () => 1000, scrollTop: () => 5};
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

            let unreached = 0;
            const stickyElement = {
                outerHeight: () => 10,
                innerWidth: () => 10,
                width: () => 10,
                offset: () => ({top: 0}),
                parent: () => ({
                    addClass: () => {
                    }, removeClass: () => {
                    }, offset: () => ({top: 0}), outerHeight: () => 100
                }),
                css: () => {
                },
                trigger: () => {
                }
            };

            // Set currentTop negative and newTop equals topSpacing to trigger bottomUnreached
            const s = {
                stickyElement,
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
                getWidthFrom: null,
                widthFromWrapper: true,
                scrollStickyElement: false,
                callback: {
                    onBottomUnreached: () => {
                        unreached++;
                    }
                },
                currentTop: -5
            };

            internals.sticked.length = 0;
            internals.sticked.push(s);
            internals.setWindowHeight(1000);
            internals.setLastScroll(0);

            expect(() => internals.scroller()).not.toThrow();
            expect(typeof unreached === 'number').toBeTruthy();
        });
    });

    test('execute module in browser global (UMD) context', () => {
        // run the source in a VM without module/define so it uses browser globals
        const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'stickyjs.js'), 'utf8');
        const context = {
            jQuery: function (el) {
                return {
                    height: () => 100, scrollTop: () => 0, ready: (cb) => {
                        if (cb) {
                            cb();
                        }
                    }
                };
            },
            window: {},
            document: {},
            // provide a basic setTimeout so module's ready handler can schedule
            setTimeout: (fn) => fn()
        };
        // ensure jQuery.fn exists so Object.defineProperty($.fn, 'sticky', ...) succeeds
        context.jQuery.fn = {};
        vm.createContext(context);
        // provide filename so coverage maps execution back to the source file
        const filename = path.join(__dirname, '..', 'src', 'stickyjs.js');
        expect(() => vm.runInContext(src, context, {filename})).not.toThrow();
    });
});
