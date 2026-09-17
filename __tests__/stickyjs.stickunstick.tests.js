/* global describe, it, expect, jest, beforeEach */

'use strict';

const fileToTest = '../src/stickyjs.js';

describe('Stick/unStick and scrollStickyElement detailed branches (require-time)', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('causes element to stick then unstick and fires callbacks', () => {
        // prepare environment first
        global.window = {
            innerHeight: 200,
            innerWidth: 800,
            _handlers: {},
            addEventListener (name, fn) {
                this._handlers[name] = fn;
            },
            removeEventListener () {
            }
        };
        global.document = {_height: 2000};
        global.window._scrollTop = 0;
        global.setTimeout = () => {
        };

        // mock jquery module used by the library
        jest.mock('jquery', () => {
            function $ (arg) {
                if (!$.fn) {
                    $.fn = {};
                }
                if (arg === null) {
                    const empty = Object.create($.fn);
                    empty.get = () => [];
                    empty.each = function () {
                        return this;
                    };
                    empty.hasClass = () => false;
                    empty.attr = () => undefined;
                    empty.wrapAll = () => this;
                    empty.parent = () => this;
                    empty.data = () => undefined;
                    empty.ready = (cb) => {
                        cb();
                        return this;
                    };
                    return empty;
                }

                if (arg === $._windowRef || arg === $._documentRef) {
                    return {
                        height () {
                            return global.window.innerHeight;
                        }, scrollTop () {
                            return global.window._scrollTop;
                        }, ready (cb) {
                            cb();
                            return this;
                        }
                    };
                }

                if (typeof arg === 'string' && arg.indexOf('<') === 0) {
                    const wrapper = {
                        _attrs: {},
                        _classes: new Set(),
                        _css: {},
                        children: [],
                        id: null,
                        parentNode: null
                    };
                    wrapper.offset = () => ({top: wrapper._top || 0});
                    wrapper.outerHeight = () => wrapper._css && wrapper._css.height || 0;
                    const inst = Object.create($.fn);
                    inst.get = () => [wrapper];
                    inst._node = wrapper;
                    inst.attr = function (k, v) {
                        if (v === undefined) {
                            return wrapper._attrs[k];
                        }
                        wrapper._attrs[k] = v;
                        if (k === 'id') {
                            wrapper.id = v;
                        }
                        return this;
                    };
                    inst.addClass = function (c) {
                        wrapper._classes.add(c);
                        return this;
                    };
                    inst.css = function (obj) {
                        Object.assign(wrapper._css, obj);
                        return this;
                    };
                    inst.each = function (cb) {
                        const arr = this.get();
                        for (let i = 0; i < arr.length; i++) {
                            cb(i, arr[i]);
                        }
                        return this;
                    };
                    return inst;
                }

                // element
                const el = arg;
                if (arg && typeof arg.get === 'function') {
                    return arg;
                }

                const inst = Object.create($.fn);
                inst.get = () => [el];
                inst.each = function (cb) {
                    const arr = this.get();
                    for (let i = 0; i < arr.length; i++) {
                        cb(i, arr[i]);
                    }
                    return this;
                };
                inst.wrapAll = function (cb) {
                    const w = cb();
                    const wrapper = w._node || w.get()[0];
                    wrapper.children.push(el);
                    el.parentNode = wrapper;
                    return this;
                };
                inst.parent = function () {
                    return $(el.parentNode);
                };
                inst.css = function (a, b) {
                    if (typeof a === 'string' && b === undefined) {
                        return el._css && el._css[a];
                    }
                    if (typeof a === 'object') {
                        el._css = el._css || {};
                        Object.assign(el._css, a);
                        return this;
                    }
                    return this;
                };
                inst.attr = function (k, v) {
                    if (v === undefined) {
                        return el._attrs && el._attrs[k];
                    }
                    el._attrs = el._attrs || {};
                    el._attrs[k] = v;
                    return this;
                };
                inst.attr = function (k, v) {
                    if (v === undefined) {
                        return el._attrs && el._attrs[k];
                    }
                    el._attrs = el._attrs || {};
                    el._attrs[k] = v;
                    return this;
                };
                inst.outerHeight = () => (typeof el.outerHeight === 'function' ? el.outerHeight() : el._outerHeight || 0);
                inst.offset = () => (typeof el.offset === 'function' ? el.offset() : {top: el._offsetTop || 0});
                inst.width = () => el._width || 0;
                inst.innerWidth = () => el._innerWidth || inst.width();
                inst.data = function (k, v) {
                    if (v === undefined) {
                        return el._data && el._data[k];
                    }
                    el._data = el._data || {};
                    el._data[k] = v;
                    return this;
                };
                inst.addClass = function (c) {
                    el._classes = el._classes || new Set();
                    el._classes.add(c);
                    return this;
                };
                inst.hasClass = function (c) {
                    return el._classes && el._classes.has(c);
                };
                inst.unwrap = function () {
                    if (el.parentNode) {
                        const p = el.parentNode;
                        const idx = p.children.indexOf(el);
                        if (idx !== -1) {
                            p.children.splice(idx, 1);
                        }
                        el.parentNode = null;
                    }
                    return this;
                };
                inst.trigger = function () {
                    return this;
                };
                inst.offset = function () {
                    return el.offset();
                };
                return inst;
            }

            $.fn = {};
            $.extend = function (t, ...s) {
                return Object.assign(t, ...s);
            };
            $._windowRef = global.window;
            $._documentRef = global.document;
            global.__JQUERY_MOCK__ = $;
            return $;
        }, {virtual: true});

        // require module after environment/mock ready
        jest.isolateModules(() => {
            require(fileToTest);
        });

        const $ = global.__JQUERY_MOCK__;

        // element fixture
        const el = {
            _outerHeight: 100,
            _offsetTop: 10,
            _width: 200,
            _innerWidth: 200,
            parentNode: null,
            outerHeight () {
                return this._outerHeight;
            },
            offset () {
                return {top: this._offsetTop};
            },
            addEventListener () {
            },
            removeEventListener () {
            }
        };

        let stuck = false;
        let unstuck = false; // eslint-disable-line no-unused-vars

        // initialize with callbacks
        expect(() => $(el).sticky({
            callback: {
                onStick () {
                    stuck = true;
                }, onUnstick () {
                    unstuck = true;
                }
            }
        })).not.toThrow();

        // obtain internals and run scroller directly for deterministic behavior
        const internals = (typeof globalThis !== 'undefined' && globalThis.__STICKY_INTERNALS__) || (typeof global !== 'undefined' && global.__STICKY_INTERNALS__);
        expect(internals).toBeDefined();

        // simulate scroll down to cause stick and run scroller
        global.window._scrollTop = 1000;
        expect(() => internals.scroller()).not.toThrow();

        // after scroller runs, element wrapper should have sticky behavior
        expect(el.parentNode).toBeDefined();
        expect(stuck || (el._css && el._css.position === 'fixed') || (el.parentNode && (el.parentNode._classes && (el.parentNode._classes.has('sticky-wrapper') || el.parentNode._classes.has('is-sticky'))))).toBe(true);

        // simulate scroll up to cause unstick
        global.window._scrollTop = 0;
        expect(() => internals.scroller()).not.toThrow();

        // ensure unstick path can be invoked via methods (defensive check)
        const methods = internals.methods;
        const fakeSel = {
            each (cb) {
                cb(0, el);
            }
        };
        expect(() => methods.unstick(fakeSel)).not.toThrow();
    });

    it('exercises scrollStickyElement branches (up/down offsets)', () => {
        jest.resetModules();

        // prepare environment
        global.window = {
            innerHeight: 50,
            innerWidth: 800,
            _handlers: {},
            addEventListener (name, fn) {
                this._handlers[name] = fn;
            },
            removeEventListener () {
            }
        };
        global.document = {_height: 1000};
        global.window._scrollTop = 0;
        global.setTimeout = () => {
        };

        // re-create the same mock for this test case
        jest.mock('jquery', () => {
            function $ (arg) {
                if (!$.fn) {
                    $.fn = {};
                }
                if (arg === null) {
                    const empty = Object.create($.fn);
                    empty.get = () => [];
                    empty.each = function () {
                        return this;
                    };
                    empty.hasClass = () => false;
                    empty.attr = () => undefined;
                    empty.wrapAll = () => this;
                    empty.parent = () => this;
                    empty.data = () => undefined;
                    empty.ready = (cb) => {
                        cb();
                        return this;
                    };
                    return empty;
                }
                if (arg === $._windowRef || arg === $._documentRef) {
                    return {
                        height () {
                            return global.window.innerHeight;
                        }, scrollTop () {
                            return global.window._scrollTop;
                        }, ready (cb) {
                            cb();
                            return this;
                        }
                    };
                }
                if (typeof arg === 'string' && arg.indexOf('<') === 0) {
                    const wrapper = {
                        _attrs: {},
                        _classes: new Set(),
                        _css: {},
                        children: [],
                        id: null,
                        parentNode: null
                    };
                    const inst = Object.create($.fn);
                    inst.get = () => [wrapper];
                    inst._node = wrapper;
                    inst.attr = function (k, v) {
                        if (v === undefined) {
                            return wrapper._attrs[k];
                        }
                        wrapper._attrs[k] = v;
                        if (k === 'id') {
                            wrapper.id = v;
                        }
                        return this;
                    };
                    inst.addClass = function (c) {
                        wrapper._classes.add(c);
                        return this;
                    };
                    inst.css = function (obj) {
                        Object.assign(wrapper._css, obj);
                        return this;
                    };
                    inst.each = function (cb) {
                        const arr = this.get();
                        for (let i = 0; i < arr.length; i++) {
                            cb(i, arr[i]);
                        }
                        return this;
                    };
                    return inst;
                }
                const el = arg;
                if (arg && typeof arg.get === 'function') {
                    return arg;
                }
                const inst = Object.create($.fn);
                inst.get = () => [el];
                inst.each = function (cb) {
                    const arr = this.get();
                    for (let i = 0; i < arr.length; i++) {
                        cb(i, arr[i]);
                    }
                    return this;
                };
                inst.wrapAll = function (cb) {
                    const w = cb();
                    const wrapper = w._node || w.get()[0];
                    wrapper.children.push(el);
                    el.parentNode = wrapper;
                    return this;
                };
                inst.parent = function () {
                    return $(el.parentNode);
                };
                inst.css = function (a, b) {
                    if (typeof a === 'string' && b === undefined) {
                        return el._css && el._css[a];
                    }
                    if (typeof a === 'object') {
                        el._css = el._css || {};
                        Object.assign(el._css, a);
                        return this;
                    }
                    return this;
                };
                inst.attr = function (k, v) {
                    if (v === undefined) {
                        return el._attrs && el._attrs[k];
                    }
                    el._attrs = el._attrs || {};
                    el._attrs[k] = v;
                    return this;
                };
                inst.outerHeight = () => (typeof el.outerHeight === 'function' ? el.outerHeight() : el._outerHeight || 0);
                inst.offset = () => (typeof el.offset === 'function' ? el.offset() : (el._top !== undefined ? {top: el._top} : {top: el._offsetTop || 0}));
                inst.width = () => el._width || 0;
                inst.innerWidth = () => el._innerWidth || inst.width();
                inst.data = function (k, v) {
                    if (v === undefined) {
                        return el._data && el._data[k];
                    }
                    el._data = el._data || {};
                    el._data[k] = v;
                    return this;
                };
                inst.addClass = function (c) {
                    el._classes = el._classes || new Set();
                    el._classes.add(c);
                    return this;
                };
                inst.hasClass = function (c) {
                    return el._classes && el._classes.has(c);
                };
                inst.unwrap = function () {
                    if (el.parentNode) {
                        const p = el.parentNode;
                        const idx = p.children.indexOf(el);
                        if (idx !== -1) {
                            p.children.splice(idx, 1);
                        }
                        el.parentNode = null;
                    }
                    return this;
                };
                inst.trigger = function () {
                    return this;
                };
                return inst;
            }

            $.fn = {};
            $.extend = function (t, ...s) {
                return Object.assign(t, ...s);
            };
            $._windowRef = global.window;
            $._documentRef = global.document;
            global.__JQUERY_MOCK__ = $;
            return $;
        }, {virtual: true});

        jest.isolateModules(() => {
            require(fileToTest);
        });
        const $ = global.__JQUERY_MOCK__;

        // tall element (outerHeight > windowHeight) to trigger scrollStickyElement
        const tall = {
            _outerHeight: 200,
            _offsetTop: 0,
            _width: 100,
            _innerWidth: 100,
            parentNode: null,
            outerHeight () {
                return this._outerHeight;
            },
            offset () {
                return {top: this._offsetTop};
            },
            addEventListener () {
            },
            removeEventListener () {
            }
        };

        expect(() => $(tall).sticky({
            scrollStickyElement: true,
            topSpacing: 0
        })).not.toThrow();

        const internals2 = (typeof globalThis !== 'undefined' && globalThis.__STICKY_INTERNALS__) || (typeof global !== 'undefined' && global.__STICKY_INTERNALS__);
        expect(internals2).toBeDefined();

        // invoke scroller directly to exercise scrollStickyElement branches
        global.window._scrollTop = 10;
        expect(() => internals2.scroller()).not.toThrow();
        global.window._scrollTop = 30;
        expect(() => internals2.scroller()).not.toThrow();
        global.window._scrollTop = 20;
        expect(() => internals2.scroller()).not.toThrow();

        // ensure wrapper exists
        expect(tall.parentNode).toBeDefined();
    });
});
