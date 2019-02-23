// ==UserScript==
// @name         Isotope Filtering
// @version      0.1
// @description  Achieve filtering by replacing masonry with isotope
// @author       e
// @match        https://knowyourmeme.com/*photos*
// @match        https://knowyourmeme.com/memes/*
// @match        https://knowyourmeme.com/users/*
// @match        https://knowyourmeme.com/search*
// @exclude      https://knowyourmeme.com/users/*/photos
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @noframes
// ==/UserScript==
/* globals jQuery, $ */

var entryFilter = GM_getValue('entryFilter', '');
var userFilter = GM_getValue('userFilter', '');
var filterSwitch = GM_getValue('filterSwitch', false);
var filterNsfw = GM_getValue('filterNsfw', false);
var filterSpoilers = GM_getValue('filterSpoilers', false);
var filteredCount = 0;
var U = 'Uploaded by';
var isNotEntry = !Boolean($('#section_header h1').find('a').length);
var $p = $('#photo_gallery');
console.log(entryFilter);
console.log(userFilter);

function filterPictures(laidOutItems) {
    $(laidOutItems).each( function() {
        var element = this.element ? $(this.element) : $(this);
        if (element.hasClass('item')) {
            var item = element.find('a');
            var entry = item.attr('href').replace(/^[^-]*-/, '');
            var user = item.find('.c').text();
            user = user.slice(user.indexOf(U) + U.length);
            user = user.substring(1, user.length -1).replace(/\n/g, ' ');

            //console.log(user);
            if (entry) {
                if (entryFilter.indexOf('|' + entry + '|') >= 0 && isNotEntry ||
                    userFilter.indexOf('|' + user + '|') >= 0)
                {
                    this.classList.add("filtered");
                    ++filteredCount;
                }
            }
        }
    });
    //if (needUpdate)
}

function updateFilter() {
    if (filterSwitch) {
        $p.isotope({ filter: ':not(.filtered)' + (filterNsfw ? '.item:has(a:has(img[class != img-nsfw]))' : '')
                    + (filterSpoilers ? '.item:has(a:has(img[class != img-spoiler]))' : '')});
    } else {
        $p.isotope({ filter: '*' });
    }
}

function setupIsotope() {
    $p.masonry('destroy');
    $p.infinitescroll('destroy');

    $p.isotope({
        // options
        itemSelector: '.item',
        // nicer reveal transition
        visibleStyle: { transform: 'translateY(0)', opacity: 1 },
        hiddenStyle: { transform: 'translateY(100px)', opacity: 0 },
    });
    return $p.data('isotope');
}

function setupInfScroll(iso) {
    $p.infiniteScroll({
        path: function() {
            var pageNumber = this.loadCount + 2;
            var e = $("#infinite-scroll-wrapper .next_page").attr("href");
            e = e.replace(/page=\d+/, "page=" + pageNumber);
            e = e.replace(/page\/\d+/, "page/" + pageNumber);
            return e;
        },
        append: '#infinite-scroll-wrapper .item',
        scrollThreshold: 30,
        outlayer: iso,
        status: '#infscr-loading',
        history: false,
    });

    $("#photo_gallery.infinite").on( 'append.infiniteScroll', function( event, response, path, items ) {
        filterPictures(items);
        $(items).find('img').unveil();
        updateFilter();
    });
    // first filtering for items that were already loaded
    filterPictures(iso.getItemElements());
    updateFilter();
}

// workaround for loading js because @require doesn't work with @grant
var script1 = document.createElement('script');
script1.onload = function () {
    var iso = setupIsotope();

    var script2 = document.createElement('script');
    script2.onload = function () {
        setupInfScroll(iso);
    };
    script2.src = "https://unpkg.com/infinite-scroll@3/dist/infinite-scroll.pkgd.min.js";
    document.head.appendChild(script2);

};
script1.src = "https://unpkg.com/isotope-layout@3/dist/isotope.pkgd.min.js";
document.head.appendChild(script1);

var nyanLoad = '<div id="infscr-loading" style="display: none;"><img alt="Loading..." src="https://s.kym-cdn.com/assets/nyan-loader-1e8a60aa470ba72bc1ade31dcc2e150f.gif"><div><em>Loading moar...</em></div></div>';
$p.append(nyanLoad);

// load colorbox on click
$("body").off("photos-loaded", "#photo_gallery");
$("#photo_gallery").on("click", "a.photo", function() {
    return $(this).colorbox({
        slideshow: false,
        slideshowSpeed: 5e3,
        href: $(this).data("colorbox-url"),
        current: "{current}|{total}",
        opacity: 1,
        scrolling: !1,
        transition: "none",
        onOpen: function() {
            return $("#colorbox").hide()
        },
        onComplete: function() {
            return $("#colorbox").fadeIn(200),
                parse_favorites(),
                parse_thumbs(),
                parsePins(),
                unsafeWindow.photoColorboxed()
        },
        onClosed: function() {
            return unsafeWindow.photoColorboxed(!0)
        }
    })
});

function appendMenu() {
    var overlay = `
        <style>
        .open-button {
          background-color: #555;
          color: white;
          padding: 16px 20px;
          border: none;
          cursor: pointer;
          opacity: 0.8;
          position: fixed;
          bottom: 23px;
          right: 28px;
          width: 300px;
          z-index: 8;
        }

        .form-popup {
          display: none;
          position: fixed;
          width: 300px;
          bottom: 0;
          right: 15px;
          border: 3px solid #f1f1f1;
          z-index: 9;
          padding: 10px;
          background-color: white;
        }

        .form-popup .btn {
          background-color: #4CAF50;
          color: white;
          padding: 16px 20px;
          border: none;
          cursor: pointer;
          width: 100%;
          margin-bottom:10px;
          opacity: 0.8;
        }

        .form-popup .btn::-moz-focus-inner {
           border: 0;
        }

        .form-popup .cancel {
          background-color: red;
        }

        .form-popup .btn:hover, .open-button:hover {
          opacity: 1;
        }

        .fthumb {
          display: flex;
          flex-direction: row;
          margin-bottom: 3px;
        }

        .finfo {
          background: rgba(0,0,0,0.75);
          padding: 11px 8px;
          width: 135px;
          font-size: 1.1em;
          line-height: 1.3em;
          color: #f0f0f0;
        }

        </style>

        <button id = "filter_open" class="open-button" onclick='document.getElementById("myForm").style.display = "block";'>Images Filtered</button>

        <div class="form-popup" id="myForm">
            <div id = "textarea_filters" style = "width: 100%; margin-top: 10px">
            <p id = "p_entry_filter" style = "text-align: center"><b>Entry filters</b></p>
            <textarea id = "entry_filter" rows="6" style="width: 100%; height: 100%; resize: none;"></textarea>
            <p id = "p_user_filter" style = "text-align: center"><b>User filters</b></p>
            <textarea id = "user_filter" rows="6" style="width: 100%; height: 100%; resize: none;"></textarea>
            <input id="cbox_filterswitch" type="checkbox" style="width: 16px; height: 16px; margin-bottom: 15px;">
            <label for="cbox_filterswitch" style="font-size: 14px;">Filter On/Off</label>
            <br>
            <input id="cbox_filternsfw" type="checkbox" style="width: 16px; height: 16px; margin-bottom: 15px;">
            <label for="cbox_filternsfw" style="font-size: 14px;">Filter nsfw</label>
            <input id="cbox_filterspoiler" type="checkbox" style="width: 16px; height: 16px; margin-bottom: 15px; margin-left: 15px">
            <label for="cbox_filterspoiler" style="font-size: 14px;">Filter spoilers</label>
            <button id = "save_filters" class="btn">✓ Save filters</button>
            </div>

            <button type="button" class="btn cancel" onclick='document.getElementById("myForm").style.display = "none";'>Close</button>
        </div>`

    $('body').append(overlay);
    $('#entry_filter').val(entryFilter);
    $('#user_filter').val(userFilter);

    $('#save_filters').click(function() {
        GM_setValue('entryFilter', $('#entry_filter').val());
        GM_setValue('userFilter', $('#user_filter').val());
    });

    $('#cbox_filternsfw').prop("checked", filterNsfw);
    $('#cbox_filternsfw').change(function() {
        GM_setValue('filterNsfw', this.checked);
        filterNsfw = this.checked;
        updateFilter();
    });

    $('#cbox_filterspoiler').prop("checked", filterSpoilers);
    $('#cbox_filterspoiler').change(function() {
        GM_setValue('filterSpoilers', this.checked);
        filterSpoilers = this.checked;
        updateFilter();
    });

    $('#cbox_filterswitch').prop("checked", filterSwitch);
    $('#cbox_filterswitch').change(function() {
        GM_setValue('filterSwitch', this.checked);
        filterSwitch = this.checked;
        updateFilter();
    });
}

appendMenu();

// append a button to entry pages to switch the filter on/off
var entryHeader = $('#maru .rel.c');
if (entryHeader.length){
    // check if entry was filtered already
    var entryToFilter = '|' + /[^/]*$/.exec(window.location.href)[0] + '|';
    var entryIndex = entryFilter.indexOf(entryToFilter);
    var entryIsFiltered = entryIndex >= 0;
    var entryBlockButton = $('<a/>', {
        'id':'filterbtn',
        'href': 'javascript:;',
        'class':'red button',
        'text': entryIsFiltered ? 'Remove from Filter' : 'Add to Filter',
        'style': 'margin-left: 10px'
    }).on('click', function(){
        entryFilter = GM_getValue('entryFilter', '');
        entryIndex = entryFilter.indexOf(entryToFilter);
        if (entryIndex >= 0) {
            entryFilter = entryFilter.substr(0, entryIndex + 1) +
                          entryFilter.substr(entryIndex + entryToFilter.length);
            if (entryFilter.length == 1) entryFilter = '';
            $(this).text('Add to Filter');
        } else {
            entryFilter += entryFilter.slice(-1) == '|' ? entryToFilter.substring(1) : entryToFilter;
            $(this).text('Remove from Filter');
        }
        GM_setValue('entryFilter', entryFilter);
    });
    entryHeader.prepend(entryBlockButton);
}

// append a button to user pages as well
var userHeader = $('#profile_info');
if (userHeader.length) {
    // check if user was filtered already
    var userToFilter = '|' + $('#profile_bio').find('h1').text() + '|';
    var userIndex = userFilter.indexOf(userToFilter);
    var userIsFiltered = userIndex >= 0;
    var userBlockButton = $('<a/>', {
        'id':'filterbtn',
        'href': 'javascript:;',
        'class':'red button',
        'text': userIsFiltered ? 'Remove from Filter' : 'Add to Filter',
        'style': 'margin-left: 24px'
    }).on('click', function() {
        userFilter = GM_getValue('userFilter', '');
        userIndex = userFilter.indexOf(userToFilter);
        if (userIndex >= 0) {
            userFilter = userFilter.substr(0, userIndex + 1) +
                         userFilter.substr(userIndex + userToFilter.length);
            if (userFilter.length == 1) userFilter = '';
            $(this).text('Add to Filter');
        } else {
            userFilter += userFilter.slice(-1) == '|' ? userToFilter.substring(1) : userToFilter;
            $(this).text('Remove from Filter');
        }
        GM_setValue('userFilter', userFilter);
    });
    userHeader.prepend(userBlockButton);
}

