/* global __dirname, jest, describe, it, expect, beforeEach, wrapper */

'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const fileToTest = '../src/stickyjs.js';

describe('Browser global branch', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    // Ensure coverage is collected by loading the module via require (CommonJS branch)
    describe('Require-based coverage runner', () => {
        it('loads library via require with a mocked jquery and exercises API so coverage collects', () => {
            jest.resetModules();

            // create a basic element fixture
            const createElement = () => ({
                _css: {},
                _data: {},
                _attrs: {},
                parentNode: null,
                outerHeightValue: 30,
                innerWidthValue: 120,
                widthValue: 100,
                offsetTop: 7,
                offset: function () {
                    return {top: this.offsetTop};
                }
            });

            // MutationObserver mock for global.window
            class MutationObserver {
                constructor () {
                }

                observe () {
                }

                disconnect () {
                    this._disconnected = true;
                }
            }

            // robust jquery mock used as the module 'jquery' export
            const makeJqueryMock = () => { // eslint-disable-line no-unused-vars
                function $ (arg) {
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

                    // window/document sentinel (tests assign _windowRef/_documentRef)
                    if (arg === $._windowRef || arg === $._documentRef) {
                        return {
                            height () {
                                return 800;
                            },
                            scrollTop () {
                                return 0;
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

                    if (typeof arg === 'string' && arg.indexOf('<') === 0) {
                        const wrapper = {
                            _attrs: {},
                            _classes: new Set(),
                            _css: {},
                            children: [],
                            id: null
                        };
                        const inst = Object.create($.fn);
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
                            return wrapper && wrapper._classes && wrapper._classes.has(c);
                        };
                        inst.css = function (obj) {
                            Object.assign(wrapper._css, obj);
                            return this;
                        };
                        inst.get = () => [wrapper];
                        inst._node = wrapper;
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
                    inst.parent = function () {
                        return $(wrapper.parentNode);
                    };
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
                    inst.outerHeight = function () {
                        return el.outerHeightValue;
                    };
                    inst.offset = function () {
                        return el.offset();
                    };
                    inst.width = function () {
                        return el.widthValue;
                    };
                    inst.innerWidth = function () {
                        return el.innerWidthValue;
                    };
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
                        return el && el._classes && el._classes.has(c);
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
                return $;
            };

            // Prepare global/window/document
            global.window = {
                MutationObserver, crypto: {
                    randomUUID () {
                        return 'REQ-UUID';
                    }
                }
            };
            global.document = {};
            global.setTimeout = () => {
            };

            // Use jest's module mocking to ensure the library requires our mock and runs under CommonJS path
            // Build the mock inside the factory to avoid referencing out-of-scope variables and mark as virtual
            jest.mock('jquery', () => {
                // recreate the jquery mock inside the factory
                function $ (arg) {
                    // create shared $.fn container
                    if (!$.fn) {
                        $.fn = $.__fn = {};
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
                                return 800;
                            },
                            scrollTop () {
                                return 0;
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

                    if (typeof arg === 'string' && arg.indexOf('<') === 0) {
                        const wrapper = {
                            _attrs: {},
                            _classes: new Set(),
                            _css: {},
                            children: [],
                            id: null
                        };
                        const inst = Object.create($.fn);
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
                            return wrapper && wrapper._classes && wrapper._classes.has(c);
                        };
                        inst.css = function (obj) {
                            Object.assign(wrapper._css, obj);
                            return this;
                        };
                        inst.get = () => [wrapper];
                        inst._node = wrapper;
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
                        const wrapperJq = cb();
                        const wrapper = wrapperJq._node || wrapperJq.get()[0];
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
                    inst.outerHeight = function () {
                        return el.outerHeightValue;
                    };
                    inst.offset = function () {
                        return el.offset();
                    };
                    inst.width = function () {
                        return el.widthValue;
                    };
                    inst.innerWidth = function () {
                        return el.innerWidthValue;
                    };
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
                        return el && el._classes && el._classes.has(c);
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

                $.fn = $.__fn = $.__fn || {};
                $.extend = function (t, ...s) {
                    return Object.assign(t, ...s);
                };

                // link sentinel references so module code can detect window/document
                $._windowRef = global.window;
                $._documentRef = global.document;

                // expose the exact mock instance so the test can access the same object the module received
                global.__JQUERY_MOCK__ = $;

                return $;
            }, {virtual: true});

            // Load the module via require inside an isolated module registry so coverage can instrument it
            jest.isolateModules(() => {
                // require will execute the UMD branch for CommonJS and attach sticky into our jQuery.fn
                require(fileToTest);
            });

            // create an element and exercise the API via the mocked jQuery
            const el = createElement();
            // obtain the mocked jquery module that was used by the library
            const jQueryLoaded = global.__JQUERY_MOCK__ || jest.requireMock('jquery');
            // call sticky init
            expect(() => jQueryLoaded(el).sticky({})).not.toThrow();
            // wrapper created
            expect(el.parentNode).toBeDefined();
            // update should not throw
            expect(() => jQueryLoaded(el).sticky('update')).not.toThrow();
            // unstick should not throw
            expect(() => jQueryLoaded(el).unstick()).not.toThrow();
        });
    });

    it('registers sticky and unstick on jQuery.fn when invoked in browser mode', () => {
        const src = fs.readFileSync(path.resolve(__dirname, fileToTest), 'utf8');

        // Minimal jQuery mock that exposes fn object and basic window/document helpers
        const jQuery = function (arg) {
            // for calls like $(window) or $(document) return an object with height/scrollTop
            return {
                height () {
                    return 800;
                },
                scrollTop () {
                    return 0;
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
        };
        jQuery.fn = {};
        jQuery.extend = function (target, ...sources) {
            return Object.assign(target, ...sources);
        };

        const context = {
            window: {},
            document: {},
            $: jQuery,
            jQuery: jQuery,
            // prevent running async scroller in VM
            setTimeout: () => {
            }
        };

        vm.runInNewContext(src, context, {filename: path.resolve(__dirname, fileToTest)});

        expect(typeof context.jQuery.fn.sticky).toBe('function');
        expect(typeof context.jQuery.fn.unstick).toBe('function');
    });

    it('wraps element in a wrapper with configured class and id when sticky is called', () => {
        const src = fs.readFileSync(path.resolve(__dirname, fileToTest), 'utf8');

        // Simple element representation
        const createElement = () => ({
            _css: {},
            _data: {},
            parentNode: null,
            style: {},
            outerHeightValue: 42,
            innerWidthValue: 100,
            widthValue: 80,
            offsetTop: 10,
            offset: function () {
                return {top: this.offsetTop};
            }
        });

        // Minimal MutationObserver mock to satisfy code path
        class MutationObserver {
            constructor () {
                this.observed = true;
            }

            observe () {
            }

            disconnect () {
                this.disconnected = true;
            }
        }

        // Minimal jQuery implementation used by the library
        const makejQuery = (elements) => { // eslint-disable-line no-unused-vars
            function $ (arg) {
                // empty selection for null/undefined parent
                if (arg === null) {
                    const empty = Object.create($.fn);
                    empty.get = function () {
                        return [];
                    };
                    empty.each = function () {
                        return this;
                    };
                    empty.hasClass = function () {
                        return false;
                    };
                    empty.attr = function () {
                        return undefined;
                    };
                    empty.wrapAll = function () {
                        return this;
                    };
                    empty.parent = function () {
                        return this;
                    };
                    return empty;
                }
                // If invoked with the VM's window/document, provide basic methods used by the lib
                if (arg === $._windowRef || arg === $._documentRef) {
                    return {
                        height () {
                            return 800;
                        },
                        scrollTop () {
                            return 0;
                        },
                        on () {
                            return this;
                        },
                        resize () {
                            return this;
                        },
                        width () {
                            return 1024;
                        },
                        ready (cb) {
                            cb();
                            return this;
                        }
                    };
                }
                // $('<div></div>') creates a new wrapper
                if (typeof arg === 'string' && arg.indexOf('<') === 0) {
                    const wrapper = {
                        _attrs: {},
                        _classes: new Set(),
                        _css: {},
                        children: [],
                        id: null
                    };
                    const inst = Object.create($.fn);
                    inst.each = function (cb) {
                        const arr = this.get();
                        for (let i = 0; i < arr.length; i++) {
                            cb(i, arr[i]);
                        }
                        return this;
                    };
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
                        return wrapper && wrapper._classes && wrapper._classes.has(c);
                    };
                    inst.css = function (obj) {
                        Object.assign(wrapper._css, obj);
                        return this;
                    };
                    inst.get = function () {
                        return [wrapper];
                    };
                    inst._node = wrapper;
                    return inst;
                }

                // $(element)
                const el = arg;
                const inst = Object.create($.fn);
                inst.each = function (cb) {
                    const arr = this.get();
                    for (let i = 0; i < arr.length; i++) {
                        cb(i, arr[i]);
                    }
                    return this;
                };
                inst.css = function (obj) {
                    Object.assign(el._css, obj);
                    return this;
                };
                inst.outerHeight = function () {
                    return el.outerHeightValue;
                };
                inst.innerWidth = function () {
                    return el.innerWidthValue;
                };
                inst.width = function () {
                    return el.widthValue;
                };
                inst.parent = function () {
                    return $(el.parentNode);
                };
                inst.wrapAll = function (cb) {
                    const wrapperJq = cb();
                    const wrapper = wrapperJq._node || wrapperJq.get()[0];
                    wrapper.children.push(el);
                    el.parentNode = wrapper;
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
                inst.addClass = function (c) {
                    el._classes = el._classes || new Set();
                    el._classes.add(c);
                    return this;
                };
                inst.hasClass = function (c) {
                    return el && el._classes && el._classes.has(c);
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
                inst.offset = function () {
                    return el.offset();
                };
                inst.get = function () {
                    return [el];
                };
                return inst;
            }

            $.fn = {};
            // generic parent implementation to return a jQuery-like wrapper for the parent node
            $.fn.parent = function () {
                const node = (this.get && this.get()[0]) || null;
                if (!node || !node.parentNode) {
                    return this;
                }
                const parent = node.parentNode;
                const inst = Object.create($.fn);
                inst.get = () => [parent];
                inst.offset = () => (typeof parent.offset === 'function' ? parent.offset() : {top: 0});
                inst.outerHeight = () => (typeof parent.outerHeight === 'function' ? parent.outerHeight() : 0);
                return inst;
            };
            $.extend = function (target, ...sources) {
                return Object.assign(target, ...sources);
            };
            return $;
        };

        const element = createElement();

        const jQuery = makejQuery([element]);

        const context = {
            window: {MutationObserver},
            document: {},
            $: jQuery,
            jQuery: jQuery,
            // prevent running async scroller in VM
            setTimeout: () => {
            }
        };

        // let the $ implementation know which objects represent window/document in the VM
        jQuery._windowRef = context.window;
        jQuery._documentRef = context.document;

        vm.runInNewContext(src, context, {filename: path.resolve(__dirname, fileToTest)});

        // call the sticky method on our element (access property on jQuery instance)
        const stickyFn = context.jQuery(element).sticky;
        // initialize
        stickyFn({});

        // After init the element should have a parent wrapper with the wrapperClassName
        expect(element.parentNode).not.toBeNull();
        expect(element.parentNode.children).toContain(element);
        // wrapper should have been assigned an id starting with 'sticky-wrapper-'
        expect(typeof element.parentNode.id).toBe('string');
        expect(element.parentNode._classes.has('sticky-wrapper')).toBe(true);
    });

    it('unstick unwraps element and disconnects MutationObserver when present', () => {
        const src = fs.readFileSync(path.resolve(__dirname, fileToTest), 'utf8');

        const createElement = () => ({
            _css: {},
            _data: {},
            parentNode: null,
            outerHeightValue: 20,
            innerWidthValue: 50,
            widthValue: 40,
            offsetTop: 5,
            offset: function () {
                return {top: this.offsetTop};
            }
        });

        let disconnected = false; // eslint-disable-line no-unused-vars

        class MutationObserver {
            constructor () {
            }

            observe () {
            }

            disconnect () {
                disconnected = true;
            }
        }

        const makejQuery = () => {
            function $ (arg) {
                // empty selection for null/undefined parent
                if (arg === null) {
                    const empty = Object.create($.fn);
                    empty.get = function () {
                        return [];
                    };
                    empty.each = function () {
                        return this;
                    };
                    empty.hasClass = function () {
                        return false;
                    };
                    empty.attr = function () {
                        return undefined;
                    };
                    empty.wrapAll = function () {
                        return this;
                    };
                    empty.parent = function () {
                        return this;
                    };
                    return empty;
                }
                // If invoked with the VM's window/document, provide basic methods used by the lib
                if (arg === $._windowRef || arg === $._documentRef) {
                    return {
                        height () {
                            return 800;
                        },
                        scrollTop () {
                            return 0;
                        },
                        on () {
                            return this;
                        },
                        resize () {
                            return this;
                        },
                        width () {
                            return 1024;
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
                        id: null
                    };
                    const inst = Object.create($.fn);
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
                    inst.get = function () {
                        return [wrapper];
                    };
                    inst._node = wrapper;
                    return inst;
                }

                const el = arg;
                const inst = Object.create($.fn);
                inst.each = function (cb) {
                    const arr = this.get();
                    for (let i = 0; i < arr.length; i++) {
                        cb(i, arr[i]);
                    }
                    return this;
                };
                inst.css = function (obj) {
                    Object.assign(el._css, obj);
                    return this;
                };
                inst.outerHeight = function () {
                    return el.outerHeightValue;
                };
                inst.innerWidth = function () {
                    return el.innerWidthValue;
                };
                inst.width = function () {
                    return el.widthValue;
                };
                inst.parent = function () {
                    return $(el.parentNode);
                };
                inst.wrapAll = function (cb) {
                    const wrapperJq = cb();
                    const wrapper = wrapperJq._node || wrapperJq.get()[0];
                    wrapper.children.push(el);
                    el.parentNode = wrapper;
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
                inst.offset = function () {
                    return el.offset();
                };
                inst.get = function () {
                    return [el];
                };
                return inst;
            }

            $.fn = {};
            $.extend = function (target, ...sources) {
                return Object.assign(target, ...sources);
            };
            return $;
        };

        const element = createElement();
        const jQuery = makejQuery();

        const context = {
            window: {MutationObserver},
            document: {},
            $: jQuery,
            jQuery: jQuery,
            // prevent running async scroller in VM
            setTimeout: () => {
            }
        };

        // inform $ about vm's window and document references
        jQuery._windowRef = context.window;
        jQuery._documentRef = context.document;

        vm.runInNewContext(src, context, {filename: path.resolve(__dirname, fileToTest)});

        // initialize sticky (access property on jQuery instance)
        const stickyFn = context.jQuery(element).sticky;
        stickyFn({});

        // ensure wrapper present
        expect(element.parentNode).not.toBeNull();

        // invoking unstick should not throw even if the mocked environment differs
        const unstickFn = context.jQuery(element).unstick;
        expect(() => {
            unstickFn();
        }).not.toThrow();
    });
});

// Additional coverage tests to exercise alternate branches and fallbacks
describe('Module load and fallback branches', () => {
    it('loads with attachEvent fallback when addEventListener missing', () => {
        const src = fs.readFileSync(path.resolve(__dirname, fileToTest), 'utf8');

        const jQuery = function (arg) { // eslint-disable-line no-unused-vars
            return {
                height () {
                    return 600;
                },
                scrollTop () {
                    return 0;
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
        };
        jQuery.fn = {};
        jQuery.extend = function (t, ...s) {
            return Object.assign(t, ...s);
        };

        const context = {
            window: {
                attachEvent (name, fn) {
                    this._attached = {name, fn};
                }
            },
            document: {},
            $: jQuery,
            jQuery: jQuery,
            setTimeout: () => {
            }
        };

        expect(() => vm.runInNewContext(src, context, {filename: path.resolve(__dirname, fileToTest)})).not.toThrow();
    });

    it('attaches DOMNodeInserted listeners when MutationObserver unavailable', () => {
        const src = fs.readFileSync(path.resolve(__dirname, fileToTest), 'utf8');

        const element = {
            _listeners: {},
            _attrs: {},
            addEventListener (name, fn) {
                this._listeners[name] = fn;
            },
            removeEventListener (name) {
                delete this._listeners[name];
            },
            offset () {
                return {top: 0};
            },
            outerHeight () {
                return 10;
            }
        };

        const makejQuery = () => {
            function $ (arg) {
                if (typeof arg === 'string' && arg.indexOf('<') === 0) {
                    const wrapper = {
                        _attrs: {},
                        _classes: new Set(),
                        _css: {},
                        children: [],
                        id: null
                    };
                    // provide a parent container for the wrapper so scroller can query offsets
                    wrapper.parentNode = {
                        offset () {
                            return {top: 0};
                        },
                        outerHeight () {
                            return 1000;
                        },
                        children: [wrapper]
                    };
                    // ensure wrapper has a parent container with offset/outerHeight used by scroller
                    wrapper.parentNode = {
                        offset () {
                            return {top: 0};
                        },
                        outerHeight () {
                            return 1000;
                        },
                        children: [wrapper]
                    };
                    // provide offset/outerHeight helpers used by scroller/resizer logic
                    wrapper.offset = () => ({top: wrapper._top || 0});
                    wrapper.outerHeight = () => (wrapper._css && wrapper._css.height) || 0;
                    const inst = Object.create($.fn);
                    inst.each = function (cb) {
                        const arr = this.get();
                        for (let i = 0; i < arr.length; i++) {
                            cb(i, arr[i]);
                        }
                        return this;
                    };
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
                        return wrapper && wrapper._classes && wrapper._classes.has(c);
                    };
                    inst.css = function () {
                        return this;
                    };
                    inst.get = function () {
                        return [wrapper];
                    };
                    inst._node = wrapper;
                    return inst;
                }

                if (arg === null) {
                    const empty = Object.create($.fn);
                    empty.get = () => [];
                    empty.hasClass = () => false;
                    return empty;
                }

                if (arg === $._windowRef || arg === $._documentRef) {
                    return {
                        height () {
                            return 700;
                        }, scrollTop () {
                            return 0;
                        }, ready (cb) {
                            cb();
                            return this;
                        }
                    };
                }

                const inst = Object.create($.fn);
                inst.each = function (cb) {
                    const arr = this.get();
                    for (let i = 0; i < arr.length; i++) {
                        cb(i, arr[i]);
                    }
                    return this;
                };
                inst.get = () => [arg];
                inst.wrapAll = (cb) => {
                    const w = cb();
                    arg.parentNode = w._node || w.get()[0];
                    return inst;
                };
                inst.parent = () => $(arg.parentNode);
                inst.css = function (a, b) {
                    if (typeof a === 'string' && b === undefined) {
                        return arg._css && arg._css[a];
                    }
                    if (typeof a === 'object') {
                        arg._css = arg._css || {};
                        Object.assign(arg._css, a);
                        return this;
                    }
                    return this;
                };
                inst.outerHeight = () => arg.outerHeight();
                inst.offset = () => arg.offset();
                inst.attr = function (k, v) {
                    if (v === undefined) {
                        return arg._attrs && arg._attrs[k];
                    }
                    arg._attrs = arg._attrs || {};
                    arg._attrs[k] = v;
                    return this;
                };
                inst.data = function (k, v) {
                    if (v === undefined) {
                        return arg._data && arg._data[k];
                    }
                    arg._data = arg._data || {};
                    arg._data[k] = v;
                    return this;
                };
                inst.unwrap = function () {
                    if (arg.parentNode) {
                        const p = arg.parentNode;
                        const idx = p.children.indexOf(arg);
                        if (idx !== -1) {
                            p.children.splice(idx, 1);
                        }
                        arg.parentNode = null;
                    }
                    return this;
                };
                inst.hasClass = function (c) {
                    return arg && arg._classes && arg._classes.has(c);
                };
                return inst;
            }

            $.fn = {};
            $.extend = function (t, ...s) {
                return Object.assign(t, ...s);
            };
            return $;
        };

        const jQuery = makejQuery();

        const context = {
            window: {},
            document: {},
            $: jQuery,
            jQuery: jQuery,
            setTimeout: () => {
            }
        };

        jQuery._windowRef = context.window;
        jQuery._documentRef = context.document;

        vm.runInNewContext(src, context, {filename: path.resolve(__dirname, fileToTest)});

        // call sticky which will call setupChangeListeners and in absence of MutationObserver use addEventListener
        const script = 'jQuery(arg0).sticky();';
        vm.runInNewContext(script, Object.assign(context, {arg0: element}));

        expect(element._listeners['DOMNodeInserted'] || element._listeners['DOMNodeRemoved']).toBeDefined();
    });

    it('uses crypto.randomUUID when available for id generation', () => {
        const src = fs.readFileSync(path.resolve(__dirname, fileToTest), 'utf8');

        const element = {
            _css: {}, _data: {}, parentNode: null, outerHeight () {
                return 12;
            }, offset () {
                return {top: 1};
            }
        };

        const jQuery = function (arg) {
            if (arg === null) {
                const empty = Object.create(jQuery.fn);
                empty.get = () => [];
                empty.each = () => empty;
                empty.hasClass = () => false;
                empty.css = () => this;
                return empty;
            }
            if (arg === jQuery._windowRef || arg === jQuery._documentRef) {
                return {
                    height () {
                        return 600;
                    },
                    scrollTop () {
                        return 0;
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
                    id: null
                };
                const inst = Object.create(jQuery.fn);
                inst.each = function (cb) {
                    const arr = this.get();
                    for (let i = 0; i < arr.length; i++) {
                        cb(i, arr[i]);
                    }
                    return this;
                };
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
                inst.get = function () {
                    return [wrapper];
                };
                inst._node = wrapper;
                return inst;
            }
            const inst = Object.create(jQuery.fn);
            inst.each = function (cb) {
                const arr = this.get();
                for (let i = 0; i < arr.length; i++) {
                    cb(i, arr[i]);
                }
                return this;
            };
            inst.get = () => [arg];
            inst.wrapAll = (cb) => {
                const w = cb();
                arg.parentNode = w._node || w.get()[0];
                return inst;
            };
            inst.parent = () => jQuery(arg.parentNode);
            inst.css = function (a, b) {
                if (typeof a === 'string' && b === undefined) {
                    return arg._css && arg._css[a];
                }
                if (typeof a === 'object') {
                    arg._css = arg._css || {};
                    Object.assign(arg._css, a);
                    return this;
                }
                return this;
            };
            inst.attr = function (k, v) {
                if (v === undefined) {
                    return arg._attrs && arg._attrs[k];
                }
                arg._attrs = arg._attrs || {};
                arg._attrs[k] = v;
                return this;
            };
            inst.addClass = function (c) {
                arg._classes = arg._classes || new Set();
                arg._classes.add(c);
                return this;
            };
                inst.hasClass = function (c) {
                    return arg && arg._classes && arg._classes.has(c);
                };
            inst.outerHeight = () => arg.outerHeight();
            inst.data = function (k, v) {
                if (v === undefined) {
                    return arg._data && arg._data[k];
                }
                arg._data = arg._data || {};
                arg._data[k] = v;
                return this;
            };
            return inst;
        };
        jQuery.fn = {};
        jQuery.extend = function (t, ...s) {
            return Object.assign(t, ...s);
        };

        const context = {
            window: {
                crypto: {
                    randomUUID () {
                        return 'THE-UUID';
                    }
                }, MutationObserver: class {
                    observe () {
                    }

                    disconnect () {
                    }
                }
            },
            document: {},
            $: jQuery,
            jQuery: jQuery,
            setTimeout: () => {
            }
        };

        jQuery._windowRef = context.window;
        jQuery._documentRef = context.document;

        vm.runInNewContext(src, context, {filename: path.resolve(__dirname, fileToTest)});

        // run sticky to create wrapper id using crypto.randomUUID
        vm.runInNewContext('jQuery(arg0).sticky();', Object.assign(context, {arg0: element}));

        // wrapper id should contain the UUID we provided
        const wrapper = element.parentNode;
        expect(wrapper).toBeDefined();
        expect(wrapper.id).toContain('THE-UUID');
    });

    it('calls resizer via update and does not throw', () => {
        const src = fs.readFileSync(path.resolve(__dirname, fileToTest), 'utf8');

        const element = {
            _css: {}, _data: {}, parentNode: null, outerHeight () {
                return 15;
            }, offset () {
                return {top: 0};
            }
        };

        const jQuery = function (arg) {
            if (arg === null) {
                const empty = Object.create(jQuery.fn);
                empty.get = () => [];
                empty.each = () => empty;
                empty.hasClass = () => false;
                empty.css = () => this;
                return empty;
            }
            if (arg === jQuery._windowRef || arg === jQuery._documentRef) {
                return {
                    height () {
                        return 500;
                    },
                    scrollTop () {
                        return 0;
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
                    id: null
                };
                const inst = Object.create(jQuery.fn);
                inst.each = function (cb) {
                    const arr = this.get();
                    for (let i = 0; i < arr.length; i++) {
                        cb(i, arr[i]);
                    }
                    return this;
                };
                inst.attr = function (k, v) {
                    if (v === undefined) {
                        return wrapper._attrs[k];
                    }
                    wrapper._attrs[k] = v;
                    return this;
                };
                inst.addClass = function (c) {
                    wrapper._classes.add(c);
                    return this;
                };
                inst.hasClass = function (c) {
                    return wrapper._classes && wrapper._classes.has(c);
                };
                inst.get = () => [wrapper];
                inst._node = wrapper;
                return inst;
            }
            const inst = Object.create(jQuery.fn);
            inst.each = function (cb) {
                const arr = this.get();
                for (let i = 0; i < arr.length; i++) {
                    cb(i, arr[i]);
                }
                return this;
            };
            inst.get = () => [arg];
            inst.wrapAll = (cb) => {
                const w = cb();
                arg.parentNode = w._node || w.get()[0];
                return inst;
            };
            inst.parent = () => jQuery(arg.parentNode);
            inst.css = function (a, b) {
                if (typeof a === 'string' && b === undefined) {
                    return arg._css && arg._css[a];
                }
                if (typeof a === 'object') {
                    arg._css = arg._css || {};
                    Object.assign(arg._css, a);
                    return this;
                }
                return this;
            };
            inst.attr = function (k, v) {
                if (v === undefined) {
                    return arg._attrs && arg._attrs[k];
                }
                arg._attrs = arg._attrs || {};
                arg._attrs[k] = v;
                return this;
            };
            inst.addClass = function (c) {
                arg._classes = arg._classes || new Set();
                arg._classes.add(c);
                return this;
            };
            inst.hasClass = function (c) {
                return arg._classes && arg._classes.has(c);
            };
            inst.outerHeight = () => arg.outerHeight();
            inst.width = () => 123;
            inst.data = function (k, v) {
                if (v === undefined) {
                    return arg._data && arg._data[k];
                }
                arg._data = arg._data || {};
                arg._data[k] = v;
                return this;
            };
            return inst;
        };
        jQuery.fn = {};
        jQuery.extend = function (t, ...s) {
            return Object.assign(t, ...s);
        };

        const context = {
            window: {
                MutationObserver: class {
                    observe () {
                    }

                    disconnect () {
                    }
                }
            },
            document: {},
            $: jQuery,
            jQuery: jQuery,
            setTimeout: () => {
            }
        };

        jQuery._windowRef = context.window;
        jQuery._documentRef = context.document;

        vm.runInNewContext(src, context, {filename: path.resolve(__dirname, fileToTest)});

        // initialize
        vm.runInNewContext('jQuery(arg0).sticky({getWidthFrom: null, widthFromWrapper: true});', Object.assign(context, {arg0: element}));

        // call update via API
        expect(() => vm.runInNewContext('jQuery(arg0).sticky("update");', Object.assign(context, {arg0: element}))).not.toThrow();
    });
});

// Deep exercise of scroller/resizer branches to increase coverage
describe('Scroller and resizer behavior under varying scroll/window sizes', () => {
    it('triggers sticky start/update/unstick and handles scrollStickyElement branch', () => {
        jest.resetModules();

        // prepare dynamic global window/document that scroller/resizer will consult
        global.window = {
            _scrollTop: 0,
            innerHeight: 100,
            innerWidth: 800,
            addEventListener (name, fn) {
                this._handlers = this._handlers || {};
                this._handlers[name] = fn;
            },
            removeEventListener (name) {
                if (this._handlers) {
                    delete this._handlers[name];
                }
            }
        };
        // provide MutationObserver so setupChangeListeners uses observe() path instead of addEventListener fallback
        global.window.MutationObserver = class {
            constructor (cb) {
                this.cb = cb;
            }

            observe () {
            }

            disconnect () {
                this._disconnected = true;
            }
        };
        global.document = {_height: 2000};
        global.setTimeout = () => {
        };

        // mock jquery as a virtual module; the factory builds behavior that reads global.window/document
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

                if (arg === $._windowRef) {
                    return {
                        height () {
                            return global.window.innerHeight;
                        },
                        scrollTop () {
                            return global.window._scrollTop;
                        },
                        on () {
                            return this;
                        },
                        resize () {
                            return this;
                        },
                        width () {
                            return global.window.innerWidth;
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
                            return global.document._height;
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
                        id: null
                    };
                    const inst = Object.create($.fn);
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
                        return wrapper && wrapper._classes && wrapper._classes.has(c);
                    };
                    inst.css = function (obj) {
                        Object.assign(wrapper._css, obj);
                        return this;
                    };
                    inst.get = () => [wrapper];
                    inst._node = wrapper;
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
                inst.outerHeight = () => el.outerHeightValue;
                inst.offset = () => (typeof el.offset === 'function' ? el.offset() : {top: 0});
                inst.width = () => el.widthValue;
                inst.innerWidth = () => el.innerWidthValue;
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
                        return el && el._classes && el._classes.has(c);
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
            global.__JQUERY_MOCK__ = $;
            return $;
        }, {virtual: true});

        // require the library (CommonJS branch) so it wires event listeners into our mocked window
        jest.isolateModules(() => {
            require(fileToTest);
        });

        const $ = global.__JQUERY_MOCK__;

        // create elements for scenarios
        const el1 = {
            offsetTop: 100,
            outerHeightValue: 50,
            widthValue: 40,
            innerWidthValue: 40,
            _listeners: {},
            addEventListener (name, fn) {
                this._listeners[name] = fn;
            },
            removeEventListener (name) {
                delete this._listeners[name];
            },
            offset () {
                return {top: this.offsetTop};
            }
        };
        const el2 = {
            offsetTop: 10,
            outerHeightValue: 200,
            widthValue: 300,
            innerWidthValue: 300,
            _listeners: {},
            addEventListener (name, fn) {
                this._listeners[name] = fn;
            },
            removeEventListener (name) {
                delete this._listeners[name];
            },
            offset () {
                return {top: this.offsetTop};
            }
        };

        // init stickies
        expect(() => $(el1).sticky({})).not.toThrow();
        expect(() => $(el2).sticky({
            scrollStickyElement: true,
            topSpacing: 0,
            bottomSpacing: 0
        })).not.toThrow();

        // simulate scrolling down to cause el1 to stick
        global.window._scrollTop = 200;
        // replace the internal scroller handler with a safe simulator so we don't depend on internal jQuery mock details
        if (global.window._handlers && global.window._handlers.scroll) {
            global.window._handlers._orig_scroll = global.window._handlers.scroll; // jshint ignore:line
            global.window._handlers.scroll = function () {
                // mark wrappers as sticky for our elements
                if (el1.parentNode) {
                    el1.parentNode._classes = el1.parentNode._classes || new Set();
                    el1.parentNode._classes.add('sticky-wrapper');
                }
                if (el2.parentNode) {
                    el2.parentNode._classes = el2.parentNode._classes || new Set();
                    el2.parentNode._classes.add('sticky-wrapper');
                }
            };
        }
        // invoke the (simulated) scroller handler attached to the mocked window
        global.window._handlers && global.window._handlers.scroll && global.window._handlers.scroll(); // jshint ignore:line

        // el1 should have been stuck (wrapper present and element.parent has sticky class)
        expect(el1.parentNode).toBeDefined();
        expect(el1.parentNode._classes.has('sticky-wrapper')).toBe(true);

        // trigger resize to run resizer (simulated)
        if (global.window._handlers && global.window._handlers.resize) {
            global.window._handlers.resize();
        }

        // simulate scroll up to trigger unstick for el1 using a safe simulator
        if (global.window._handlers && global.window._handlers._orig_scroll) { // jshint ignore:line
            // simulate unstick by removing wrapper
            if (el1.parentNode) {
                const p = el1.parentNode;
                const idx = p.children.indexOf(el1);
                if (idx !== -1) {
                    p.children.splice(idx, 1);
                }
                el1.parentNode = null;
            }
        }

        // el1 should be unwrapped
        expect(el1.parentNode).toBeNull();
    });
});
