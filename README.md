# StickyJS

Sticky is a jQuery plugin that gives you the ability to make any element on your page always stay visible.

______________________________________________________________________

<!-- mdformat-toc start --slug=github --maxlevel=6 --minlevel=2 -->

- [A Bit of History](#a-bit-of-history)
- [StickyJS in Brief](#stickyjs-in-brief)
- [Usage](#usage)
  - [Download](#download)
  - [Include jQuery and StickyJS](#include-jquery-and-stickyjs)
  - [Call StickyJS](#call-stickyjs)
- [Options](#options)
- [Methods](#methods)
- [Callback Functions](#callback-functions)
- [Events](#events)

<!-- mdformat-toc end -->

______________________________________________________________________

## A Bit of History<a name="a-bit-of-history"></a>

This plugin was originally created by Anthony Garand in 2011 (as far as I could find
out), [see Repository here](https://github.com/garand/sticky), but the last official
release was in October 2015 ([v1.0.3](https://github.com/garand/sticky/releases/tag/1.0.3)).
In September 2022 the project was archived, and the repository was made read-only,
and the plugin has not been maintained for several years.

Since this is a nice lib, which I use in several projects, I decided to fork it and
modernize it a bit, and make it available for the community. The original code is still
there, but I have made some changes to make it more modern and compatible with the latest
versions of jQuery.

## StickyJS in Brief<a name="stickyjs-in-brief"></a>

This is how it works:

- When the target element is about to be hidden, the plugin will add the class `className` to it (and to a wrapper added as its parent), set it to `position: fixed` and calculate its new `top`, based on the element's height, the page height and the `topSpacing` and `bottomSpacing` options.
- That's it.

In some cases you might need to set a fixed width to your element when it is "sticky".
But by default (`widthFromWrapper == true`) sticky updates element's width to the wrapper's width.
Check the `example-*.html` files for some examples.

## Usage<a name="usage"></a>

### Download<a name="download"></a>

You can download the latest version of StickyJS from the [releases page](https://github.com/ppfeufer/stickyjs/releases/latest/download/stickyjs.zip).

> [!IMPORTANT]
>
> Do not use the JS file from the `src` folder, as this is the development version and can be unstable and buggy. \
> Use only the JS files from the `dist` folder, which is included in the release archives.

### Include jQuery and StickyJS<a name="include-jquery-and-stickyjs"></a>

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js" crossorigin="anonymous" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="></script>
<script src="stickyjs.min.js"></script>
```

### Call StickyJS<a name="call-stickyjs"></a>

```javascript
$(document).ready(() => {
    const elementSticky = $('#sticker');

    elementSticky.sticky({
        topSpacing: 0
    });
});
```

Edit your CSS to position the elements (check the examples in `example-*.html`).

To unstick an object

```javascript
const elementSticky = $('#sticker');

elementSticky.unstick();
```

## Options<a name="options"></a>

| Option                       | Type        | Default            | Description                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ----------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `topSpacing`                 | int         | `0`                | Pixels between the page top, and the element's top.                                                                                                                                                                                                                                                       |
| `bottomSpacing`              | int         | `0`                | Pixels between the page bottom, and the element's bottom.                                                                                                                                                                                                                                                 |
| `className`                  | string      | `'is-sticky'`      | CSS class added to the element's wrapper when "sticky".                                                                                                                                                                                                                                                   |
| `wrapperClassName`           | string      | `'sticky-wrapper'` | CSS class added to the wrapper.                                                                                                                                                                                                                                                                           |
| `center`                     | boolean     | `false`            | Boolean determining whether the sticky element should be horizontally centered in the page.                                                                                                                                                                                                               |
| `getWidthFrom`               | string      | `null`             | Selector of element referenced to set fixed width of "sticky" element.                                                                                                                                                                                                                                    |
| `widthFromWrapper`           | boolean     | `true`             | Boolean determining whether width of the "sticky" element should be updated to match the wrapper's width. Wrapper is a placeholder for "sticky" element while it is fixed (out of static elements flow), and its width depends on the context and CSS rules. Works only as long `getWidthFrom` isn't set. |
| `responsiveWidth`            | boolean     | `false`            | Boolean determining whether widths will be recalculated on window resize (using `getWidthFrom`).                                                                                                                                                                                                          |
| `zIndex`                     | string\|int | `'inherit'`        | Controls z-index of the sticky element.                                                                                                                                                                                                                                                                   |
| `scrollStickyElement`        | boolean     | `false`            | Boolean determining whether the sticky element should scroll with the page when it is sticky. If set to `true`, the sticky element will scroll with the page, but will still be constrained by the `topSpacing` and `bottomSpacing` options.                                                              |
| `callback`                   | object      | `{}`               | Object containing callback functions for the following events:                                                                                                                                                                                                                                            |
| `onStick(element)`           | function    | `null`             | When the element becomes sticky.                                                                                                                                                                                                                                                                          |
| `onUnstick(element)`         | function    | `null`             | When the element returns to its original location.                                                                                                                                                                                                                                                        |
| `onUpdate(element)`          | function    | `null`             | When the element is sticky but position must be updated for constraints reasons.                                                                                                                                                                                                                          |
| `onBottomReached(element)`   | function    | `null`             | When the element reached the bottom space limit.                                                                                                                                                                                                                                                          |
| `onBottomUnreached(element)` | function    | `null`             | When the element unreached the bottom space limit.                                                                                                                                                                                                                                                        |

## Methods<a name="methods"></a>

| Method             | Description                          |
| ------------------ | ------------------------------------ |
| `sticky(options)`  | Initializer. `options` is optional.  |
| `sticky('update')` | Recalculates the element's position. |

## Callback Functions<a name="callback-functions"></a>

| Callback Function            | Description                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `onStick(element)`           | When the element becomes sticky.                                                 |
| `onUnstick(element)`         | When the element returns to its original location.                               |
| `onUpdate(element)`          | When the element is sticky but position must be updated for constraints reasons. |
| `onBottomReached(element)`   | When the element reached the bottom space limit.                                 |
| `onBottomUnreached(element)` | When the element unreached the bottom space limit.                               |

```javascript
const elementSticky = $('#sticker');

$('#sticker').sticky({
    topSpacing: 0,
    center: true,
    callback: {
        onStick: element => {
            const domElement = element && element.jquery ? element[0] : element;

            console.log('Dom Element:', domElement);
            console.log(`Element #${domElement.id} has become sticky.`);
        },
        onUnstick: element => {
            const domElement = element && element.jquery ? element[0] : element;

            console.log('Dom Element:', domElement);
            console.log(`Element #${domElement.id} is no longer sticky.`);
        },
        onUpdate: element => {
            const domElement = element && element.jquery ? element[0] : element;

            console.log('Dom Element:', domElement);
            console.log(`Element #${domElement.id} has been updated.`);
        },
        onBottomReached: element => {
            const domElement = element && element.jquery ? element[0] : element;

            console.log('Dom Element:', domElement);
            console.log(`Element #${domElement.id} has reached the bottom.`);
        },
        onBottomUnreached: element => {
            const domElement = element && element.jquery ? element[0] : element;

            console.log('Dom Element:', domElement);
            console.log(`Element #${domElement.id} has left the bottom.`);
        }
    }
});
```

## Events<a name="events"></a>

All callback functions are also available as events, which can be subscribed to using jQuery's `on` method.

| Event                     | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| `sticky-start`            | When the element becomes sticky.                                                 |
| `sticky-end`              | When the element returns to its original location.                               |
| `sticky-update`           | When the element is sticky but position must be updated for constraints reasons. |
| `sticky-bottom-reached`   | When the element reached the bottom space limit.                                 |
| `sticky-bottom-unreached` | When the element unreached the bottom space limit.                               |

To subscribe to events use jQuery:

```javascript
const elementSticky = $('#sticker');

$('#sticker').sticky({
  topSpacing: 0,
  center: true,
})
    .on('sticky-start', event => {
        const domElement = event && event.target && event.target.jquery ? event.target[0] : event.target;

        console.log('Dom Element:', domElement);
        console.log(`Element #${domElement.id} has become sticky.`);
    })
    .on('sticky-end', event => {
        const domElement = event && event.target && event.target.jquery ? event.target[0] : event.target;

        console.log('Dom Element:', domElement);
        console.log(`Element #${domElement.id} is no longer sticky.`);
    })
    .on('sticky-update', event => {
        const domElement = event && event.target && event.target.jquery ? event.target[0] : event.target;

        console.log('Dom Element:', domElement);
        console.log(`Element #${domElement.id} has been updated.`);
    })
    .on('sticky-bottom-reached', event => {
        const domElement = event && event.target && event.target.jquery ? event.target[0] : event.target;

        console.log('Dom Element:', domElement);
        console.log(`Element #${domElement.id} has reached the bottom.`);
    })
    .on('sticky-bottom-unreached', event => {
        const domElement = event && event.target && event.target.jquery ? event.target[0] : event.target;

        console.log('Dom Element:', domElement);
        console.log(`Element #${domElement.id} has left the bottom.`);
    });
```
