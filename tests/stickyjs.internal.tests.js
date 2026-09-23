/* global describe, it, expect, jest, beforeEach */

'use strict';

const fileToTest = '../src/stickyjs.js';

describe('Direct internal invocation via exposed __TEST_INTERNALS__', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('calls scroller/resizer and covers multiple internal branches', () => {
        // prepare environment first
        global.window = {
            innerHeight: 120,
            innerWidth: 800,
            _handlers: {},
            addEventListener (name, fn) {
                this._handlers[name] = fn;
            },
            removeEventListener () {
            }
        };
        global.document = {_height: 2000};
        global.setTimeout = () => {
        };

        // mock jquery used by module
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
                            return global.window._scrollTop || 0;
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
                return inst;
            }

            $.fn = {};
            $.extend = function (t, ...s) {
                return Object.assign(t, ...s);
            };
            $._windowRef = global.window;
            $._documentRef = global.document;
            return $;
        }, {virtual: true});

        // load instrumented module
        jest.isolateModules(() => {
            require(fileToTest);
        });

        // Internals may be exposed on module.exports.__TEST_INTERNALS__ or on globalThis.__STICKY_INTERNALS__
        let internals;
        try {
            const lib = require(fileToTest);
            internals = lib && lib.__TEST_INTERNALS__;
        } catch (e) { // eslint-disable-line no-unused-vars
            // ignore
        }
        internals = internals || (typeof globalThis !== 'undefined' && globalThis.__STICKY_INTERNALS__) || (typeof global !== 'undefined' && global.__STICKY_INTERNALS__);
        expect(internals).toBeDefined();

        // build a variety of sticked entries to hit branches
        internals.sticked.length = 0;

        // unstick branch (currentTop != null -> becomes null)
        const raw1 = {
            _offsetTop: 50, _outerHeight: 20, offset () {
                return {top: this._offsetTop};
            }, outerHeight () {
                return this._outerHeight;
            }, _data: {
                'sticky.mutationObserver': {
                    disconnect () {
                    }
                }
            }, addEventListener () {
            }, removeEventListener () {
            }
        };
        const s1 = {
            stickyElement: {
                get () {
                    return [raw1];
                }, outerHeight () {
                    return raw1.outerHeight();
                }, innerWidth () {
                    return 0;
                }, width () {
                    return 0;
                }, offset () {
                    return raw1.offset();
                }, css () {
                }, parent () {
                    return {
                        removeClass () {
                        }, addClass () {
                        }
                    };
                }, trigger () {
                }
            },
            stickyWrapper: {
                css () {
                }, offset () {
                    return {top: 100};
                }, width () {
                    return 200;
                }, parent () {
                    return {
                        offset () {
                            return {top: 0};
                        }, outerHeight () {
                            return 100;
                        }
                    };
                }
            },
            topSpacing: 0,
            bottomSpacing: 0,
            className: 'is-sticky',
            zIndex: 'inherit',
            scrollStickyElement: false,
            getWidthFrom: null,
            widthFromWrapper: true,
            responsiveWidth: false,
            callback: {
                onUnstick () { /* noop */
                }
            },
            currentTop: 10
        };

        // newTop negative path
        const raw2 = {
            _offsetTop: 5, _outerHeight: 100, offset () {
                return {top: this._offsetTop};
            }, outerHeight () {
                return this._outerHeight;
            }, addEventListener () {
            }, removeEventListener () {
            }
        };
        const s2 = {
            stickyElement: {
                get () {
                    return [raw2];
                }, outerHeight () {
                    return raw2.outerHeight();
                }, innerWidth () {
                    return 0;
                }, width () {
                    return 0;
                }, offset () {
                    return raw2.offset();
                }, css () {
                }, parent () {
                    return {
                        removeClass () {
                        }, addClass () {
                        }
                    };
                }, trigger () {
                }
            },
            stickyWrapper: {
                css () {
                }, offset () {
                    return {top: 0};
                }, width () {
                    return 100;
                }, parent () {
                    return {
                        offset () {
                            return {top: 0};
                        }, outerHeight () {
                            return 0;
                        }
                    };
                }
            },
            topSpacing: 5,
            bottomSpacing: 5,
            className: 'is-sticky',
            zIndex: 'inherit',
            scrollStickyElement: false,
            getWidthFrom: null,
            widthFromWrapper: true,
            responsiveWidth: false,
            callback: {},
            currentTop: null
        };

        // scrollStickyElement branch
        const raw3 = {
            _offsetTop: 0, _outerHeight: 300, offset () {
                return {top: this._offsetTop};
            }, outerHeight () {
                return this._outerHeight;
            }, addEventListener () {
            }, removeEventListener () {
            }
        };
        const s3 = {
            stickyElement: {
                get () {
                    return [raw3];
                }, outerHeight () {
                    return raw3.outerHeight();
                }, innerWidth () {
                    return 0;
                }, width () {
                    return 0;
                }, offset () {
                    return raw3.offset();
                }, css (obj) {
                    this._css = this._css || {};
                    Object.assign(this._css, obj);
                }, parent () {
                    return {
                        removeClass () {
                        }, addClass () {
                        }
                    };
                }, trigger () {
                }
            },
            stickyWrapper: {
                css () {
                }, offset () {
                    return {top: 0};
                }, width () {
                    return 120;
                }, parent () {
                    return {
                        offset () {
                            return {top: 0};
                        }, outerHeight () {
                            return 0;
                        }
                    };
                }
            },
            topSpacing: 0,
            bottomSpacing: 0,
            className: 'is-sticky',
            zIndex: 'inherit',
            scrollStickyElement: true,
            getWidthFrom: null,
            widthFromWrapper: true,
            responsiveWidth: false,
            callback: {},
            currentTop: null
        };

        internals.sticked.push(s1, s2, s3);

        // run scroller/resizer across scenarios
        internals.setLastScroll(0);
        global.window._scrollTop = 0;
        expect(() => internals.scroller()).not.toThrow();

        global.window._scrollTop = 500; // cause big scroll
        expect(() => internals.scroller()).not.toThrow();

        internals.setLastScroll(600);
        global.window._scrollTop = 550; // scrolling up
        expect(() => internals.scroller()).not.toThrow();

        // Additional scenarios to cover width/getWidthFrom, update vs start, bottom reached/unreached and unstick
        // getWidthFrom path: create an element to use as width source
        const widthSrc = {
            width () {
                return 123;
            }
        };
        const raw4 = {
            _offsetTop: 0, _outerHeight: 10, offset () {
                return {top: this._offsetTop};
            }, outerHeight () {
                return this._outerHeight;
            }, addEventListener () {
            }, removeEventListener () {
            }
        };
        const s4 = {
            stickyElement: {
                get () {
                    return [raw4];
                }, outerHeight () {
                    return raw4.outerHeight();
                }, innerWidth () {
                    return 120;
                }, width () {
                    return 110;
                }, offset () {
                    return raw4.offset();
                }, css (obj) {
                    this._css = this._css || {};
                    Object.assign(this._css, obj);
                }, parent () {
                    return {
                        removeClass () {
                        }, addClass () {
                        }
                    };
                }, trigger () {
                }
            },
            stickyWrapper: {
                css () {
                }, offset () {
                    return {top: 0};
                }, width () {
                    return 200;
                }, parent () {
                    return {
                        offset () {
                            return {top: 0};
                        }, outerHeight () {
                            return 0;
                        }
                    };
                }
            },
            topSpacing: 0,
            bottomSpacing: 0,
            className: 'is-sticky',
            zIndex: '10',
            scrollStickyElement: false,
            getWidthFrom: widthSrc,
            widthFromWrapper: false,
            responsiveWidth: true,
            callback: {},
            currentTop: null
        };

        // widthFromWrapper path
        const raw5 = {
            _offsetTop: 0, _outerHeight: 10, offset () {
                return {top: this._offsetTop};
            }, outerHeight () {
                return this._outerHeight;
            }, addEventListener () {
            }, removeEventListener () {
            }
        };
        const s5 = {
            stickyElement: {
                get () {
                    return [raw5];
                }, outerHeight () {
                    return raw5.outerHeight();
                }, innerWidth () {
                    return 0;
                }, width () {
                    return 88;
                }, offset () {
                    return raw5.offset();
                }, css (obj) {
                    this._css = this._css || {};
                    Object.assign(this._css, obj);
                }, parent () {
                    return {
                        removeClass () {
                        }, addClass () {
                        }
                    };
                }, trigger () {
                }
            },
            stickyWrapper: {
                css () {
                }, offset () {
                    return {top: 0};
                }, width () {
                    return 150;
                }, parent () {
                    return {
                        offset () {
                            return {top: 0};
                        }, outerHeight () {
                            return 0;
                        }
                    };
                }
            },
            topSpacing: 2,
            bottomSpacing: 0,
            className: 'is-sticky',
            zIndex: '5',
            scrollStickyElement: false,
            getWidthFrom: null,
            widthFromWrapper: true,
            responsiveWidth: false,
            callback: {},
            currentTop: 5
        };

        // bottom reached scenario
        const raw6 = {
            _offsetTop: 0, _outerHeight: 50, offset () {
                return {top: this._offsetTop};
            }, outerHeight () {
                return this._outerHeight;
            }, addEventListener () {
            }, removeEventListener () {
            }
        };
        const s6 = {
            stickyElement: {
                get () {
                    return [raw6];
                }, outerHeight () {
                    return raw6.outerHeight();
                }, innerWidth () {
                    return 0;
                }, width () {
                    return 0;
                }, offset () {
                    return raw6.offset();
                }, css (obj) {
                    this._css = this._css || {};
                    Object.assign(this._css, obj);
                }, parent () {
                    return {
                        removeClass () {
                        }, addClass () {
                        }
                    };
                }, trigger () {
                }
            },
            stickyWrapper: {
                css () {
                }, offset () {
                    return {top: 0};
                }, width () {
                    return 100;
                }, parent () {
                    return {
                        offset () {
                            return {top: 0};
                        }, outerHeight () {
                            return 1;
                        }
                    };
                }
            },
            topSpacing: 0,
            bottomSpacing: 0,
            className: 'is-sticky',
            zIndex: '1',
            scrollStickyElement: false,
            getWidthFrom: null,
            widthFromWrapper: false,
            responsiveWidth: false,
            callback: {
                onBottomReached () { /* noop */
                }, onBottomUnreached () { /* noop */
                }
            },
            currentTop: 0
        };

        // unstick absolute positioning scenario (reach end of container)
        const raw7 = {
            _offsetTop: 0, _outerHeight: 20, offset () {
                return {top: 0};
            }, outerHeight () {
                return this._outerHeight;
            }, addEventListener () {
            }, removeEventListener () {
            }
        };
        const parentContainer = {
            offset () {
                return {top: 0};
            }, outerHeight () {
                return 10;
            }
        };
        const s7 = {
            stickyElement: {
                get () {
                    return [raw7];
                }, outerHeight () {
                    return raw7.outerHeight();
                }, innerWidth () {
                    return 0;
                }, width () {
                    return 0;
                }, offset () {
                    return raw7.offset();
                }, css (obj) {
                    this._css = this._css || {};
                    Object.assign(this._css, obj);
                }, parent () {
                    return {
                        removeClass () {
                        }, addClass () {
                        }, parent () {
                            return parentContainer;
                        }
                    };
                }, trigger () {
                }
            },
            stickyWrapper: {
                css () {
                }, offset () {
                    return {top: 0};
                }, width () {
                    return 10;
                }, parent () {
                    return parentContainer;
                }
            },
            topSpacing: 0,
            bottomSpacing: 0,
            className: 'is-sticky',
            zIndex: '',
            scrollStickyElement: false,
            getWidthFrom: null,
            widthFromWrapper: false,
            responsiveWidth: false,
            callback: {},
            currentTop: 0
        };

        internals.sticked.push(s4, s5, s6, s7);

        // exercise scroller across new scenarios
        internals.setLastScroll(400);
        global.window._scrollTop = 450;
        expect(() => internals.scroller()).not.toThrow();

        internals.setLastScroll(450);
        global.window._scrollTop = 440;
        expect(() => internals.scroller()).not.toThrow();

        // explicit unstick call via methods to ensure unstick path works
        const methods = internals.methods;
        const fakeSel = {
            each (cb) {
                cb(0, raw1);
            }
        };
        expect(() => methods.unstick(fakeSel)).not.toThrow();

        // resize
        expect(() => internals.resizer()).not.toThrow();
    });
});
