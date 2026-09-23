/* global describe, it, expect, __dirname */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const fileToTest = '../src/stickyjs.js';

describe('Expose and directly exercise internal functions for full branch coverage', () => {
    it('injects test hooks into the source and calls scroller/resizer and helper paths', () => {
        const srcPath = path.resolve(__dirname, fileToTest);
        let src = fs.readFileSync(srcPath, 'utf8');

        // Inject a small exposure snippet before the final closing of the factory so tests can call internals
        const inject = '\n    // expose internals for tests if running in a VM context\n    if (typeof window !== \'undefined\') { window.__TEST_EXPOSE__ = { scroller: scroller, resizer: resizer, createUniqueId: createUniqueId, methods: methods, sticked: sticked }; }\n';

        // Replace the last occurrence of '\n});\n' with injection + '\n});\n' to keep structure
        const lastClose = src.lastIndexOf('\n});\n');
        if (lastClose === -1) {
            // fallback: append injection
            src = src + inject;
        } else {
            src = src.slice(0, lastClose) + inject + src.slice(lastClose);
        }

        // Prepare a minimal jQuery and window/document environment to exercise internals
        const MutationObserver = class {
            constructor (cb) {
                this.cb = cb;
            }

            observe () {
            }

            disconnect () {
                this._disconnected = true;
            }
        };

        const createElement = (opts = {}) => ({
            _css: {},
            _data: {},
            parentNode: null,
            _outerHeight: opts.h || 10,
            _width: opts.w || 100,
            _innerWidth: opts.iw || (opts.w || 100),
            _offsetTop: opts.top || 0,
            outerHeight () {
                return this._outerHeight;
            },
            offset () {
                return {top: this._offsetTop};
            }
        });

        // Create jQuery mock similar to other tests; accepts the VM context so it can reference window/document there
        const makejQuery = (ctx) => {
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
                if (arg === $._windowRef) {
                    return {
                        height () {
                            return ctx.window.innerHeight;
                        }, scrollTop () {
                            return ctx.window._scrollTop;
                        }, ready (cb) {
                            cb();
                            return this;
                        }
                    };
                }
                if (arg === $._documentRef) {
                    return {
                        height () {
                            return ctx.document._height;
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
                inst.outerHeight = () => (typeof el.outerHeight === 'function' ? el.outerHeight() : el._outerHeight || 0);
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
                inst.get = function () {
                    return [el];
                };
                return inst;
            }

            $.fn = {};
            $.fn.parent = function () {
                const node = (this.get && this.get()[0]) || null;
                const parent = node && node.parentNode ? node.parentNode : null;
                const inst = Object.create($.fn);
                inst.get = () => parent ? [parent] : [];
                inst.offset = () => (parent && typeof parent.offset === 'function' ? parent.offset() : {top: 0});
                inst.outerHeight = () => (parent && typeof parent.outerHeight === 'function' ? parent.outerHeight() : 0);
                return inst;
            };
            $.extend = function (t, ...s) {
                return Object.assign(t, ...s);
            };
            $._windowRef = ctx.window;
            $._documentRef = ctx.document;
            return $;
        };

        // prepare context and run modified source
        const context = {
            window: {
                MutationObserver,
                innerHeight: 60,
                innerWidth: 800,
                _scrollTop: 0,
                addEventListener (name, fn) {
                    this._handlers = this._handlers || {};
                    this._handlers[name] = fn;
                }
            },
            document: {_height: 1000},
            setTimeout: () => {
            },
            console: console
        };

        // create jQuery and attach sentinel refs
        context.jQuery = context.$ = makejQuery(context);

        // run instrumented file in VM so coverage attributes to the original filename
        vm.runInNewContext(src, context, {filename: srcPath});

        // obtain exposed internals
        const expose = context.window.__TEST_EXPOSE__;
        expect(expose).toBeDefined();

        // prepare elements and initialize via methods.init exposed inside the VM
        const elA = createElement({h: 20, w: 120, top: 10});
        const elB = createElement({h: 200, w: 300, top: 0}); // tall element
        const jQ = context.jQuery;

        // call init via methods to ensure sticked entries exist
        // methods.init expects a jQuery-like selection, so call with our element wrapper
        const methods = expose.methods;
        expect(typeof methods.init).toBe('function');

        // init elements
        methods.init.call(jQ(elA), jQ(elA), {});
        methods.init.call(jQ(elB), jQ(elB), {scrollStickyElement: true, topSpacing: 0});

        // call scroller/resizer directly to run branches
        expect(() => expose.scroller()).not.toThrow();
        expect(() => expose.resizer()).not.toThrow();

        // change document height and scroll to force negative newTop and bottom reached logic
        context.document._height = 5;
        context.window._scrollTop = 4;
        expect(() => expose.scroller()).not.toThrow();

        // call createUniqueId to exercise fallback path (no crypto in our context)
        const id = expose.createUniqueId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
    });
});
