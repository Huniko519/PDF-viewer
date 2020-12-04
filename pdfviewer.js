/*
 * Copyright 2014 Ambris
 *
 * Project : Very simple PDF viewer jQuery plugin
 * Version : 0.1
 * author: Richard Stefan (richard.stefan@ambris.com)
 *
 * Licensed under the Apache License, Version 2.0(the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function($) {

    var customStyle = {
        width: '100px',
        height: '100px',
        overflow: 'scroll',
        position: 'absolute',
        top: '-9999px'
    };

    var $scrollDiv = $("<div>").css(customStyle);
    var scrollDiv = $scrollDiv.get(0);
    $("body").append($scrollDiv);

    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    var scrollbarHeight = scrollDiv.offsetHeight - scrollDiv.clientHeight;
    document.body.removeChild(scrollDiv);

    $.scrollbar = {
        width: function() {
            return scrollbarWidth;
        },

        height: function() {
            return scrollbarHeight;
        }
    };
})(jQuery);

(function($) {
    /*
     * loads JS Script on demand
     *  -> thx to Chris' answer at http://stackoverflow.com/questions/7716280/auto-load-include-for-javascript
     */
    var js_loader = {
        assets: {},
        include: function(asset_name, callback) {
            if (typeof callback != 'function')
                callback = function() {
                    return false;
                };

            if (typeof this.assets[asset_name] != 'undefined')
                return callback();


            var html_doc = document.getElementsByTagName('head')[0];
            var st = document.createElement('script');
            st.setAttribute('language', 'javascript');
            st.setAttribute('type', 'text/javascript');
            st.setAttribute('src', asset_name);
            st.onload = function() {
                js_loader._script_loaded(asset_name, callback);
            };
            html_doc.appendChild(st);
        },
        _script_loaded: function(asset_name, callback) {
            this.assets[asset_name] = true;
            callback();
        }
    };

    $.js_loader = js_loader;
})(jQuery);

(function($) {
    $.pdfviewer = function(element, options) {

        var defaults = {
            href: '', // for demonstration purpose
            scale: 1.0,
            autoFit: false,
            toolbar_template: '<div class="pdf-toolbar">' +
                '<button id="pdf-prev">Previous</button>' +
                '<button id="pdf-next">Next</button>' +
                '<span class="pdf-pager">Page:<span id="pdf-page-num"></span>/<span id="pdf-page-count"></span></span>' +
                '<button id="pdf-autofit-height">Adjust Height</button>' +
                '<button id="pdf-autofit-width">Adjust Width</button>' +
                '<button id="pdf-autofit">Auto fit</button>' +
                '</div>',
            viewer_template: '<div class="pdf-canvas"><canvas id="pdf-the-canvas"></canvas></div>',

            onPrevPage: function() {
                return true;
            },
            onNextPage: function() {
                return true;
            },
            onDocumentLoaded: function() {},
            onBeforeRenderPage: function(num) {
                return true;
            },
            onRenderedPage: function(num) {}
        }

        var plugin = this;

        plugin.settings = {};

        var $element = $(element), // reference to the jQuery version of DOM element
            element = element, // reference to the actual DOM element
            elt_width = $element.innerWidth(),
            elt_heigth = $element.innerHeight();

        var pdfDoc = null,
            pageNum = 1,
            pageRendering = false,
            pageNumPending = null,
            scale = 1.0,
            canvas = null,
            ctx = null;

        var initialize = function() {
            PDFJS.workerSrc = (function() {
                'use strict';
                var scriptTagContainer = document.body ||
                    document.getElementsByTagName('head')[0];
                var pdfjsSrc = $("script[src*='pdf.js']").get(0).src;
                return pdfjsSrc && pdfjsSrc.replace(/(\.js$)|(\.js(\?.*))$/i, '.worker.js$3');
            })();

            PDFJS.disableWorker = true;

            scale = plugin.settings.scale;
            canvas = $('#pdf-the-canvas', element).get(0);
            ctx = canvas.getContext('2d');


            $('#pdf-prev', element).on('click', plugin.prevPage);
            $('#pdf-next', element).on('click', plugin.nextPage);
            $('#pdf-autofit-height', element).on('click', plugin.autoFitScaleByHeight);
            $('#pdf-autofit-width', element).on('click', plugin.autoFitScaleByWidth);
            $('#pdf-autofit', element).on('click', plugin.autoFit);

            /**
             * Asynchronously downloads PDF.
             */
            PDFJS.getDocument(plugin.settings.href).then(function(pdfDoc_) {
                pdfDoc = pdfDoc_;
                plugin.settings.onDocumentLoaded.call(element);

                $('#pdf-page-count', element).text(pdfDoc.numPages);

                // Initial/first page rendering
                plugin.renderPage(pageNum);
            });

        }

        plugin.init = function() {

            options = options || {};
            options.href = options.href || $element.data('href');

            plugin.settings = $.extend({}, defaults, options);

            $element.html(build());

            if ('undefined' != typeof PDFJS) {
                initialize();
            } else {
                console.log('pdf.js not loaded. Try to dynamicly load "pdf.js" to your page.');

                var scriptTagContainer = document.body || document.getElementsByTagName('head')[0];
                var pdfjsSrc = $("script[src*='pdfviewer.js']").get(0).src;
                pdfjsSrc = pdfjsSrc.replace(/(pdfviewer\.js$)|(pdfviewer\.js(\?.*))$/i, 'pdfjs-dist/build/pdf.js$3');

                $.js_loader.include(pdfjsSrc, initialize);

                return plugin;
            }
        };


        // public methods
        /**
         * Get page info from document, resize canvas accordingly, and render page.
         * @param num Page number.
         */
        plugin.renderPage = function(num) {

            if (!plugin.settings.onBeforeRenderPage.call(element, num)) return;

            pageRendering = true;
            // Using promise to fetch the page
            pdfDoc.getPage(num).then(function(page) {
                var viewport = page.getViewport(scale);
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                $('.pdf-canvas').css('margin-top', $('.pdf-toolbar').height() + 1);
                if (canvas.width < $(canvas).parent().width() - 20)
                    $(canvas).css('margin-left', (($(canvas).parent().width() - canvas.width) / 2));
                else
                    $(canvas).css('margin-left', 0);


                // now default all the dimension info
                // finally query the various pixel ratios
                var devicePixelRatio = window.devicePixelRatio || 1,
                    backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                    ctx.mozBackingStorePixelRatio ||
                    ctx.msBackingStorePixelRatio ||
                    ctx.oBackingStorePixelRatio ||
                    ctx.backingStorePixelRatio || 1,

                    ratio = devicePixelRatio / backingStoreRatio;

                // upscale the canvas if the two ratios don't match
                if (devicePixelRatio !== backingStoreRatio) {

                    var oldWidth = canvas.width;
                    var oldHeight = canvas.height;

                    canvas.width = oldWidth * ratio;
                    canvas.height = oldHeight * ratio;

                    canvas.style.width = oldWidth + 'px';
                    canvas.style.height = oldHeight + 'px';

                    // now scale the context to counter
                    // the fact that we've manually scaled
                    // our canvas element
                    ctx.scale(ratio, ratio);

                }

                // Render PDF page into canvas context
                var renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                var renderTask = page.render(renderContext);

                // Wait for rendering to finish
                renderTask.promise.then(function() {
                    pageRendering = false;

                    plugin.settings.onRenderedPage.call(element, num);

                    if (pageNumPending !== null) {
                        // New page rendering is pending
                        plugin.renderPage(pageNumPending);
                        pageNumPending = null;
                    }
                });
            });

            // Update page counters
            $('#pdf-page-num', element).text(pageNum);
        };

        plugin.currentPage = function() {
            return pageNum;
        };

        plugin.pages = function() {
            return pdfDoc.numPages;
        };

        /**
         * Displays previous page.
         */
        plugin.prevPage = function() {
            if (!plugin.settings.onPrevPage.call(element)) return;

            if (pageNum <= 1) {
                return;
            }
            pageNum--;
            queueRenderPage(pageNum);
        };

        /**
         * Displays next page.
         */
        plugin.nextPage = function() {
            if (!plugin.settings.onNextPage.call(element)) return;

            if (pageNum >= pdfDoc.numPages) {
                return;
            }
            pageNum++;
            queueRenderPage(pageNum);
        }

        plugin.autoFit = function() {
            pdfDoc.getPage(pageNum).then(function(page) {
                var parentHeight = $(canvas).parent().height();
                var parentWidth = $(canvas).parent().width();
                var viewport = page.getViewport(1.0);

                if (parentHeight <= parentWidth)
                    plugin.autoFitScaleByHeight();
                else
                    plugin.autoFitScaleByWidth();
            });
        }


        plugin.autoFitScaleByHeight = function() {
            pdfDoc.getPage(pageNum).then(function(page) {
                var parentHeight = $(canvas).parent().height() - 1;
                var parentWidth = $(canvas).parent().width() - 1;

                var viewport = page.getViewport(1.0);
                scale = parentHeight / viewport.height;

                if (scale * viewport.width >= parentWidth)
                    scale = (parentHeight - $.scrollbar.height()) / viewport.height;

                queueRenderPage(pageNum);
            });
        }

        plugin.autoFitScaleByWidth = function() {
            pdfDoc.getPage(pageNum).then(function(page) {
                var parentWidth = $(canvas).parent().width() - 1;
                var parentHeight = $(canvas).parent().height() - 1;

                var viewport = page.getViewport(1.0);
                scale = parentWidth / viewport.width;

                if (scale * viewport.height >= parentHeight)
                    scale = (parentWidth - $.scrollbar.width()) / viewport.width;

                queueRenderPage(pageNum);
            });
        }

        // private methods
        var build = function() {
            return plugin.settings.toolbar_template + plugin.settings.viewer_template;
        }

        /**
         * If another page rendering in progress, waits until the rendering is
         * finised. Otherwise, executes rendering immediately.
         */
        var queueRenderPage = function(num) {
            if (pageRendering) {
                pageNumPending = num;
            } else {
                plugin.renderPage(num);
            }
        }

        plugin.init();
    }

    $.fn.pdfviewer = function(options) {

        return this.each(function() {

            if (undefined == $(this).data('pdfviewer')) {

                var plugin = new $.pdfviewer(this, options);

                // in the jQuery version of the element
                // store a reference to the plugin object
                // you can later access the plugin and its methods and properties like
                // element.data('pdfviewer').publicMethod(arg1, arg2, ... argn) or
                // element.data('pdfviewer').settings.propertyName
                $(this).data('pdfviewer', plugin);

            }

        });

    }

})(jQuery);