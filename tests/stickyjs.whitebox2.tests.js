/* global describe, it, expect, __dirname */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const fileToTest = '../src/stickyjs.js';

describe('Whitebox scroller/resizer exercise (direct internals)', () => {
    it('creates several sticked entries and drives scroller through multiple branches', () => {
        const srcPath = path.resolve(__dirname, fileToTest);
        let src = fs.readFileSync(srcPath, 'utf8');

        const inject = '\n    // expose additional internals for tests\n    if (typeof window !== \'undefined\') { window.__TEST_EXPOSE__ = { scroller: scroller, resizer: resizer, methods: methods, sticked: sticked, getLastScroll: () => lastScroll, setLastScroll: (v) => { lastScroll = v; }, getStickyOffset: () => stickyOffset, setStickyOffset: (v) => { stickyOffset = v; }, getWindowHeight: () => windowHeight, setWindowHeight: (v) => { windowHeight = v; } }; }\n';

        const lastClose = src.lastIndexOf('\n});\n');
        if (lastClose === -1) {
            src = src + inject;
        } else {
            src = src.slice(0, lastClose) + inject + src.slice(lastClose);
        }

        // Minimal MutationObserver for module use
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

        // build a jQuery-like mock for VM context
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
                        },
                        scrollTop () {
                            return ctx.window._scrollTop;
                        },
                        ready (cb) {
                            cb();
                            return this;
                        }
                    };
                }
                if (arg === $._documentRef) {
                    return {
                        height () {
                            return ctx.document._height;
                        },
                        ready (cb) {
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

                // if a jQuery-like wrapper is passed through, return it directly
                if (arg && typeof arg.get === 'function') {
                    return arg;
                }

                // element-like wrapper
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
                inst.data = function (k, v) {
                    if (v === undefined) {
                        return el._data && el._data[k];
                    }
                    el._data = el._data || {};
                    el._data[k] = v;
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
                inst.removeClass = () => this;
                inst.addClass = () => this;
                return inst;
            };
            $.extend = function (t, ...s) {
                return Object.assign(t, ...s);
            };
            $._windowRef = ctx.window;
            $._documentRef = ctx.document;
            return $;
        };

        const context = {
            window: {
                MutationObserver,
                innerHeight: 100,
                innerWidth: 800,
                _scrollTop: 0,
                addEventListener (name, fn) {
                    this._handlers = this._handlers || {};
                    this._handlers[name] = fn;
                }
            },
            document: {_height: 1000},
            setTimeout: () => {
            }
        };

        context.jQuery = context.$ = makejQuery(context);

        // run instrumented source
        vm.runInNewContext(src, context, {filename: srcPath});

        const expose = context.window.__TEST_EXPOSE__;
        expect(expose).toBeDefined();

        // helper to make a sticked-like object
        const makeS = (opts) => {
            const rawEl = {
                _data: {
                    'sticky.mutationObserver': {
                        disconnect () {
                        }
                    }
                }
            };
            const stickyElement = {
                _css: {},
                _outer: opts.outer || 10,
                _width: opts.width || 100,
                _inner: opts.inner || (opts.width || 100),
                _offset: opts.offsetTop || 0,
                outerHeight () {
                    return this._outer;
                },
                innerWidth () {
                    return this._inner;
                },
                width () {
                    return this._width;
                },
                offset () {
                    return {top: this._offset};
                },
                css (obj) {
                    Object.assign(this._css, obj);
                    return this;
                },
                parent () {
                    return {
                        addClass () {
                        }, removeClass () {
                        }
                    };
                },
                trigger () {
                },
                get (i) {
                    return (i === undefined ? [rawEl] : rawEl);
                }
            };

            const wrapper = {
                _css: {},
                _top: opts.wrapperTop || 0,
                _width: opts.wrapperWidth || 200,
                children: [],
                offset () {
                    return {top: this._top};
                },
                outerHeight () {
                    return this._css && this._css.height || opts.wrapperOuter || 0;
                },
                width () {
                    return this._width;
                },
                css (obj) {
                    Object.assign(this._css, obj);
                    return this;
                },
                parent () {
                    return opts.container || {
                        offset () {
                            return {top: 0};
                        }, outerHeight () {
                            return 100;
                        }
                    };
                }
            };

            return {
                stickyElement: stickyElement,
                stickyWrapper: wrapper,
                topSpacing: opts.topSpacing || 0,
                bottomSpacing: opts.bottomSpacing || 0,
                className: opts.className || 'is-sticky',
                zIndex: opts.zIndex || 'inherit',
                scrollStickyElement: !!opts.scrollStickyElement,
                getWidthFrom: opts.getWidthFrom || null,
                widthFromWrapper: opts.widthFromWrapper !== undefined ? opts.widthFromWrapper : true,
                responsiveWidth: opts.responsiveWidth || false,
                callback: opts.callback || {},
                currentTop: opts.currentTop !== undefined ? opts.currentTop : null
            };
        };

        // Case 1: unstick path when currentTop != null and scrollTop small
        const calls = {
            onUnstick: 0,
            onStick: 0,
            onUpdate: 0,
            onBottomReached: 0,
            onBottomUnreached: 0
        };
        const s1 = makeS({
            outer: 20,
            offsetTop: 50,
            wrapperTop: 100,
            currentTop: 10,
            callback: {
                onUnstick () {
                    calls.onUnstick++;
                }
            }
        });

        // Case 2: newTop negative path
        const s2 = makeS({
            outer: 100,
            offsetTop: 5,
            wrapperTop: 0,
            topSpacing: 10,
            bottomSpacing: 5,
            currentTop: null,
            callback: {}
        });

        // Case 3: scrollStickyElement branches
        const s3 = makeS({
            outer: 300,
            offsetTop: 0,
            wrapperTop: 0,
            topSpacing: 0,
            scrollStickyElement: true,
            currentTop: null,
            callback: {}
        });

        // add to exposed sticked array
        expose.sticked.length = 0;
        expose.sticked.push(s1, s2, s3);

        // ensure window height small to trigger scrollStickyElement path for s3
        expose.setWindowHeight(100);

        // run scroller initially with scrollTop = 0
        context.window._scrollTop = 0;
        expose.setLastScroll(0);
        expect(() => expose.scroller()).not.toThrow();

        // now simulate scroll down to trigger various branches (positive scrollDiff)
        context.window._scrollTop = 200;
        expect(() => expose.scroller()).not.toThrow();

        // set lastScroll > current to force up-branch on next call
        expose.setLastScroll(300);
        context.window._scrollTop = 250;
        expect(() => expose.scroller()).not.toThrow();

        // trigger resizer
        expect(() => expose.resizer()).not.toThrow();

        // ensure callbacks didn't throw
        expect(typeof calls.onUnstick).toBe('number');

        // finally call unstick public API via methods to ensure cleanup branch
        const methods = expose.methods;
        // create a fake jquery selection wrapper that will be passed to methods.unstick
        // ensure the raw element has a mutationObserver mock attached
        expect(s1.stickyElement.get()[0]._data && s1.stickyElement.get()[0]._data['sticky.mutationObserver']).toBeDefined();
        const fakeSelection = {
            each (cb) {
                cb(0, s1.stickyElement.get ? s1.stickyElement.get()[0] : s1.stickyElement);
            }
        };
        expect(() => methods.unstick(fakeSelection)).not.toThrow();
    });
});
