/** @jest-environment jsdom */

/* global describe, it, jest, expect, beforeEach */

'use strict';

const fileToTest = '../src/stickyjs.js';

describe('jsdom integration tests for stickyjs (browser-like)', () => {
    beforeEach(() => {
        jest.resetModules();
        // ensure a clean global window/document provided by jsdom
        // jsdom's global.window and global.document are available automatically
    });

    it('initializes sticky via require with a virtual jquery that uses jsdom globals and responds to scroll/resize', () => {
        // create a virtual jquery module that interacts with jsdom-provided globals
        jest.mock('jquery', () => {
            function $ (arg) {
                // null selection
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

                // window/document sentinel
                if (arg === $._windowRef || arg === $._documentRef) {
                    return {
                        height () {
                            return global.window.innerHeight || 800;
                        },
                        scrollTop () {
                            return global.window.pageYOffset || 0;
                        },
                        on () {
                            return this;
                        },
                        resize () {
                            return this;
                        },
                        ready (cb) {
                            cb();
                            return this;
                        }
                    };
                }

                // $('<div></div>') wrapper
                if (typeof arg === 'string' && arg.indexOf('<') === 0) {
                    const wrapper = {
                        _attrs: {},
                        _classes: new Set(),
                        _css: {},
                        children: [],
                        id: null,
                        parentNode: {
                            offset () {
                                return {top: 0};
                            }, outerHeight () {
                                return 1000;
                            }
                        }
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
                    inst.hasClass = function (c) {
                        return wrapper._classes && wrapper._classes.has(c);
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
                    inst.parent = function () {
                        return $(wrapper.parentNode);
                    };
                    return inst;
                }

                // $(element) wrapper around jsdom element or simple object fixture
                const el = arg;
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
                    const wrapperJq = cb();
                    const wrapper = wrapperJq._node || wrapperJq.get()[0];
                    if (wrapper.appendChild) {
                        wrapper.appendChild(el);
                    } else {
                        wrapper.children = wrapper.children || [];
                        wrapper.children.push(el);
                        try {
                            el.parentNode = wrapper;
                        } catch (e) { // eslint-disable-line no-unused-vars
                        }
                    }
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
                inst.outerHeight = () => (typeof el.outerHeight === 'function' ? el.outerHeight() : (el._outerHeight || 0));
                inst.offset = () => (typeof el.offset === 'function' ? el.offset() : {top: el._offsetTop || 0});
                inst.width = () => el._width || 0;
                inst.innerWidth = () => el._innerWidth || inst.width();
                inst.attr = function (k, v) {
                    if (v === undefined) {
                        return el._attrs && el._attrs[k];
                    }
                    el._attrs = el._attrs || {};
                    el._attrs[k] = v;
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
                inst.data = function (k, v) {
                    if (v === undefined) {
                        return el._data && el._data[k];
                    }
                    el._data = el._data || {};
                    el._data[k] = v;
                    return this;
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
            // expose the mock so the test can access the exact instance the module received
            global.__JQUERY_MOCK__ = $;
            return $;
        }, {virtual: true});

        // ensure MutationObserver is not present so the library will fall back to addEventListener
        if (global.window && global.window.MutationObserver) {
            delete global.window.MutationObserver;
        }

        // load the module (CommonJS branch) which will receive our virtual jquery
        jest.isolateModules(() => {
            require(fileToTest);
        });

        // prefer the exact mock instance created by the jest.mock factory
        const $ = global.__JQUERY_MOCK__ || require('jquery');

        // create a simple element fixture (plain object) and initialize
        const el = {
            _outerHeight: 60,
            _offsetTop: 20,
            _width: 200,
            _innerWidth: 200,
            parentNode: null,
            addEventListener () {
            },
            removeEventListener () {
            },
            offset () {
                return {top: this._offsetTop};
            },
            outerHeight () {
                return this._outerHeight;
            }
        };

        expect(() => $(el).sticky({})).not.toThrow();
        expect(el.parentNode).toBeDefined();

        // simulate scroll event to exercise scroller
        global.window.pageYOffset = 1000;
        const ev = new Event('scroll');
        global.window.dispatchEvent(ev);

        // call update and unstick
        expect(() => $(el).sticky('update')).not.toThrow();
        expect(() => $(el).unstick()).not.toThrow();
    });
});
