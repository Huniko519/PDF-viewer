# pdfviewer : a very simple PDF viewer for jQuery

based on [PDF.js](http://mozilla.github.io/pdf.js/) and inspired by [this example](http://jsbin.com/pdfjs-prevnext-v2/6865/edit#html,live)

## Installation

Add the following files to your application :

    pdfviewer.js
    pdfviewer.css


Add the following lines to your html page :
##### Javascript #####

    <script src="http://mozilla.github.io/pdf.js/build/pdf.js"></script>
    <script src="pdfviewer.js"></script>

##### CSS #####

    <link rel="stylesheet" type="text/css" href="pdfviewer.css">

## Usage

In order to display the viewer, you need to attach it to a HTML element.

    <div class="pdf-container" data-href="your-pdf-url"></div>

Then call the plugin when document is ready

    $(document).ready(function() {
        $(".pdf-container").pdfviewer();
    }

## Examples

See the following file to learn how to use

    example.html

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

