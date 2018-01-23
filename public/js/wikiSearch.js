const myURL = 'http://localhost:3060';

//TODO: Have this be an extension because many websites do not allow themselves to be presented in an iframe  (see https://stackoverflow.com/questions/7422300/checking-if-a-website-doesnt-permit-iframe-embed)... as an extension, I can also get information (like URLs) about other tabs!

// TODO: Allow picking multiple tags at the same time

// TODO: When picking relations, allow not just a dropdown menu (selectmenu) but also an autocomplete widget(http://jqueryui.com/autocomplete/) 


// ======================= Function definitions =================== //

/**
 * 
 * 
 * @param {any} struct - struct to be converted to a wiki api query
 * @returns url - the wiki query
 */
function structToURL(struct) {
    var key, url = [];
    for (key in struct)
        struct.hasOwnProperty(key) && url.push(key + "=" + encodeURIComponent(struct[key]));
    return url.join("&")
}

/**
 * When I get search results, I want it to look as much as possible like the search results from the Wikipedia homepage: https://www.wikipedia.org 
 * 
 */
function sample() {
    var searchTerm = $("#searchTerm").val();

    //form the query
    var url = "https://en.wikipedia.org/w/api.php?";
    var queryStruct = {
        action: "query",
        format: "json",
        generator: "prefixsearch",
        prop: "pageimages|pageterms",
        redirects: "",
        piprop: "thumbnail",
        pithumbsize: 80, //tumbnail size
        pilimit: 15, //related to number of returned results (?)
        wbptterms: "description",
        gpssearch: searchTerm,
        gpsnamespace: 0,
        gpslimit: 15 //related to number of returned results (?)
    };
    url = url + structToURL(queryStruct) + "&callback=?";

    $.ajax({
        url: url,
        dataType: "json",

        success: function (data) {
            $("#output").html("<hr>"); //remove list of previous results 

            //TODO: Clean this up ... first, have the code that creates everything, then have code that orders them in the best possible way!!!!! 
            if (("query" in data) && ("pages" in data["query"])) {
                data = data["query"]["pages"];
            } else {
                data = {}; //nothing interesting ... we can skip
            }

            // iterating over data: inspired from https://stackoverflow.com/questions/8312459/iterate-through-object-properties
            Object.keys(data).forEach(function (key) {
                // form an entery in $("#output") of the form:
                // <div> <img> <a href = link to Wiki page> <h2> Title </h2? </a> <p> summary of Wiki page </p></div> <hr>   
                var div = document.createElement("div");
                div.className = 'result';
                //add the img corresponding to the entry (if it exists)
                if (("thumbnail" in data[key]) && ("source" in data[key]["thumbnail"])) {
                    imgURL = data[key]["thumbnail"]["source"];
                    var img = document.createElement('img');
                    img.src = imgURL;
                    img.className = "wikiImg";
                    div.appendChild(img);
                }
                //add title
                var h2Elem = document.createElement('h2');
                h2Elem.className = "wikiTitle";
                var textNode = document.createTextNode(data[key]["title"]);
                h2Elem.appendChild(textNode);
                div.appendChild(h2Elem);
                // add the description of each entry to div
                var skipEntry = false;
                if (("terms" in data[key]) && ("description" in data[key]["terms"])) {
                    var descrip = data[key]["terms"]["description"][0];
                    if (descrip === "Wikimedia disambiguation page") {
                        skipEntry = true;
                    };
                    var para = document.createElement('p');
                    var textNode2 = document.createTextNode(descrip);
                    para.appendChild(textNode2);
                    div.appendChild(para);
                }
                //add the pick button
                var imgButton = document.createElement("img");
                imgButton.className = "pickButton"; //CAN I RE-USE IT???
                imgButton.src = "https://upload.wikimedia.org/wikipedia/commons/4/45/Twemoji_2705.svg";
                imgButton.alt = "pick this wiki entry";
                imgButton.title = "pick this wiki entry";
                // store the page id and title of the wiki page in the data
                $(imgButton).data('pageid', data[key]["pageid"]);
                $(imgButton).data('title', data[key]["title"]);
                div.appendChild(imgButton);
                // add div to the list of returned wikipedia results, unless Wikipedia page is a "Wikimedia disambiguation page"
                if (!skipEntry) {
                    $('#output').append(div);
                };
            });
        },
        error: function (error) {
            alert("error in searching Wiki");
        }
    }); //ajax ends
}; //click function ends

// if the input box is not empty, search for its contents with the sample function
function searchAftrClick() {
    var searchTerm = $("#searchTerm").val();

    if (searchTerm.length > 0) {
        sample();
    } else {
        // search string is of 0 length ... remove list of previous results
        $("#output").html("<hr>");
    }
}

/**
 * when a list item from the TOC is clicked, update the iFrame next to it, and highlight the list item that is clicked
 * 
 * @param {any} elem - the jquery element correspoding to the list item that is clicked
 * @param {string} [subTitle=""] - the subTitle (subsection) corresponding to the list item; if no title is provided, then the link to the head webpage article is provided 
 */
function updateIframeAndHighlight(elem, subTitle = "") {
    // first get the iframe that is next to the list
    var iframeTemp = elem.parent();
    while (iframeTemp[0].nodeName != "DIV") {
        iframeTemp = $(iframeTemp).parent();
    };
    iframeTemp = iframeTemp.find("iframe");

    var newURL = iframeTemp[0].src.split("#");

    if (subTitle.length == 0) {
        iframeTemp[0].src = newURL[0];
    } else {
        // have iframe's src point to the new subsection
        iframeTemp[0].src = newURL[0] + '#' + subTitle;
    }

    // first check if a an element with that id already exists 
    if ($("#triggeredLi").length > 0) {
        $("#triggeredLi").removeAttr('id');
    };
    elem.attr("id", "triggeredLi");
}

//  ======================================================================== //

$(document).ready(function () {
    var clickDisabled = false;

    $("#relation").selectmenu();

    $("#submit").button({
        icon: "ui-icon-circle-check"
    });
    $("#submit").click(() => {
        // only if everything has been chosen, allow the selections to be submitted
        if ($("#pickWebsite").length > 0) {
            alert("please pick a website to tag");
        } else if ($("#searchTerm").length > 0) {
            alert("please pick a wiki entry")
        } else if ($("#relation").val() == null) {
            alert("please pick a relation");
        } else { //everything has been selected
            let website = $("#webPickDiv").data("choice");
            let relation = $("#relation").val();
            let wikiTag = $("#wikiSearchDiv").find("iframe")[0].src;


            // send the choice to the server
            let data = {
                website: website,
                relation: relation,
                wikiTag: wikiTag
            };
            $.ajax({
                type: 'POST',
                data: data,
                url: myURL,
                success: function (data) {
                    let wikiTagDescription = $("#wikiSearchDiv").find(".cancelP")[0].textContent;
                    let strChoice = "You chose: " + website + " " + relation + " " + wikiTagDescription;

                    alert('success: ' + strChoice);

                },
                error: function (xhr, textStatus, error) {
                    if (xhr.status === 400 && xhr.responseText === 'Invalid website URL') {
                        alert('invalid URL; please choose a new one');

                        // cancel the choice by simulating clicking the 'cancel choice button'
                        $("#webPickDiv").find('button').first().trigger("click");
                    } else {
                        let errorURL = myURL + '/' + xhr.status + '.html';
                        window.location.href = errorURL;
                    }

                }
            });
        }
    });

    // check when the enter key is pressed in the pick URL bar, and act accordingly
    $("#pickWebsite").keyup(function (e) {
        if (e.keyCode == 13) { //enter pressed
            var urlUser = $("#pickWebsite").val();

            // remove the pick bar
            var $pickTerm = $("#pickWebsite").detach();

            // show the chosen title 
            var divChoice = document.createElement("div");
            var pElem = document.createElement("p");
            pElem.textContent = "You chose " + urlUser;
            // add a cancel button
            var cancelButton = document.createElement("button");
            cancelButton.className = "ui-button ui-widget ui-corner-all cancelButton";
            cancelButton.textContent = "Cancel Choice";
            // add them to the HTML document
            divChoice.appendChild(pElem);
            divChoice.appendChild(cancelButton);
            $(divChoice).appendTo("#webPickDiv");

            // add an iframe showing the user their choice
            var iframe = document.createElement("iframe");
            iframe.src = urlUser;
            iframe.scrolling = "no";
            iframe.className = "preview"
            //Show the chosen element; have the iframe be like a thumbnail: inspiration from https://stackoverflow.com/questions/37914683/making-iframes-act-like-images
            var divFrame = document.createElement("div");
            divFrame.className = "staticIframeContainer";
            divFrame.appendChild(iframe);
            $(divFrame).appendTo("#webPickDiv");

            // record the choice in the parent div
            $("#webPickDiv").data("choice", urlUser);

            // design what the cancel button does
            $(cancelButton).click(function () {
                $(divFrame).remove();
                $(divChoice).remove();
                $("#webPickDiv").data("choice", "");

                $pickTerm.appendTo("#webPickDiv");
            });
        }
    });

    // check when a key is pressed in the search bar, and act accordingly
    $("#searchTerm").keyup((e) => {
        if (e.keyCode == 8) { //backspace pressed
            setTimeout(searchAftrClick, 300)
        } else {
            setTimeout(searchAftrClick, 30);
        }
    });


    //event handlers for dynamically generated content

    // when the the wiki choose button (or TODO: title: ".wikiTitle") is clicked
    $('#output').on('click', '.pickButton', function () {
        if (clickDisabled) {
            return;
        }
        // to prevent 2 dialog windows from opening: see https://stackoverflow.com/questions/8335177/disable-click-event-handler-for-a-duration-of-time
        clickDisabled = true;
        setTimeout(() => {
            clickDisabled = false;
        }, 500);

        // first clear the previously selected list item if it exists (the picked element is the list item $("#triggeredLi"))
        if ($("#triggeredLi").length > 0) {
            $("#triggeredLi").removeAttr('id');
        };

        // retrieve the pageID
        var pageID = $(this).data('pageid');
        var pageTitle = $(this).data('title');

        //the div that will house both the iframe and the TOC
        var totalDiv = document.createElement("div");

        // form a query to get the TOC
        var url = "https://en.wikipedia.org/w/api.php?";
        var queryStruct = {
            action: "parse",
            pageid: pageID,
            format: "json",
            prop: "sections"
        };
        url = url + structToURL(queryStruct) + "&callback=?";

        $.ajax({
            url: url,
            dataType: "json",

            success: function (data) {
                var arr = data.parse["sections"];

                var currTOClvl = 1;
                var ul = document.createElement("ul");
                ul.className = "TOCul";
                var entireLi = document.createElement("li");
                entireLi.textContent = "Entire article";
                ul.appendChild(entireLi);
                // highlight entireLi if it is clicked, and update the iframe next to it
                $(entireLi).click(function () {
                    updateIframeAndHighlight($(this));
                });

                // necessary tricks because there are different levels of ULs.
                var currUL = ul;
                var currTOClevel = 1;
                for (var ind in arr) {
                    var title = arr[ind]["line"];
                    // don't include TOC entries like "references"
                    if (title.match("References|External links|See also|Citations|Sources|Notes|Bibliography|Further reading|Reference literature|Bibliographies|Footnotes") == null) {
                        // first create the li element and then decide where to put it
                        var li = document.createElement("li");
                        li.className = "liTOC"
                        li.textContent = title;
                        //store the link to the subsection in data
                        $(li).data('linkTitle', arr[ind]["anchor"]);

                        // when the list element is clicked, change the iframe; and highlight li if it is clicked
                        $(li).click(function () {
                            updateIframeAndHighlight($(this), $(this).data("linkTitle"));
                        });

                        // decide where to put the li element
                        if (arr[ind]["toclevel"] > currTOClevel) { // switch to a lower level TC
                            currTOClevel = arr[ind]["toclevel"];
                            var newUL = document.createElement("ul");
                            currUL.appendChild(newUL);
                            currUL = newUL;
                            currUL.appendChild(li);

                        } else if (arr[ind]["toclevel"] < currTOClevel) { //going up a level so we are reverting back to the old list
                            currTOClevel = arr[ind]["toclevel"];
                            currUL = $(currUL).parent()[0];
                            currUL.appendChild(li);
                        } else { //we are at the same TOC level
                            currUL.appendChild(li);
                        };
                    };
                };

                // add an iframe so the user can preview a wiki entry; inspiration from :https://stackoverflow.com/questions/2117046/how-to-show-live-preview-in-a-small-popup-of-linked-page-on-mouse-over-on-link
                var iframe = document.createElement("iframe");
                iframe.className = "preview";
                // getting url from page id: inspiration from https://stackoverflow.com/questions/35323728/get-wikipedia-page-url-by-pageid
                var urlWiki = "https://en.wikipedia.org/?curid=" + pageID;
                iframe.src = urlWiki;

                // put everything in a div and then attach it to a dialog
                totalDiv.appendChild(iframe);
                totalDiv.appendChild(ul);
                $(totalDiv).dialog({
                    modal: true,
                    resizable: false,
                    width: "auto",
                    height: "auto",
                    position: {
                        my: "top",
                        at: "top",
                        of: '#output'
                    },
                    buttons: [{
                            class: "centerDialogButton",
                            text: "Choose",
                            icon: "ui-icon-check",
                            click: function () {
                                if ($("#triggeredLi").length == 0) {
                                    $("<p> Nothing chosen! </p>").dialog({
                                        modal: true,
                                        position: {
                                            my: "center",
                                            at: "center",
                                            of: $(totalDiv)
                                        }
                                    });
                                } else {
                                    $(this).dialog("close");
                                    var $searchTerm = $("#searchTerm").detach();
                                    var $output = $("#output").detach();

                                    // show the chosen title 
                                    var divChoice = document.createElement("div");
                                    var pElem = document.createElement("p");
                                    if ($("#triggeredLi").text() !== "Entire article") {
                                        pElem.textContent = "sub-topic: " + $("#triggeredLi").text() + ", of the topic: " + pageTitle;
                                    } else {
                                        pElem.textContent = "Topic: " + pageTitle;
                                    }
                                    pElem.className = "cancelP";
                                    // add a cancel button
                                    var cancelButton = document.createElement("button");
                                    cancelButton.className = "ui-button ui-widget ui-corner-all cancelButton";
                                    cancelButton.textContent = "Cancel Choice";
                                    // add them to the HTML document
                                    divChoice.appendChild(pElem);
                                    divChoice.appendChild(cancelButton);
                                    $(divChoice).appendTo("#wikiSearchDiv");

                                    //Show the chosen element; have the iframe be like a thumbnail: inspiration from https://stackoverflow.com/questions/37914683/making-iframes-act-like-images
                                    var divFrame = document.createElement("div");
                                    divFrame.className = "staticIframeContainer";
                                    iframe.scrolling = "no";
                                    divFrame.appendChild(iframe);
                                    $(divFrame).appendTo("#wikiSearchDiv");

                                    // design what the cancel button does
                                    $(cancelButton).click(() => {
                                        $(divFrame).remove();
                                        $(divChoice).remove();

                                        $searchTerm.appendTo("#wikiSearchDiv");
                                        $output.appendTo("#wikiSearchDiv");
                                    });
                                };
                            }
                        },
                        {
                            text: "Cancel",
                            icon: "ui-icon-close",
                            click: function () {
                                $(this).dialog("close");
                            },
                            showText: false
                        }
                    ],
                    // the dialog closes if a click is registered outside of the dialog; from: https://stackoverflow.com/questions/2554779/jquery-ui-close-dialog-when-clicked-outside
                    open: function (event, ui) {
                        $('.ui-widget-overlay').bind('click', function () {
                            $(totalDiv).dialog('close');
                        });
                    }
                }); //dialog init ends

                // remove the title bar of the created dialog; solution taken from Douda's sol in https://stackoverflow.com/questions/1023072/jquery-ui-dialog-how-to-initialize-without-a-title-bar
                $(totalDiv).siblings('div.ui-dialog-titlebar').remove();

                // scroll so that the dialog appears; solution from https://stackoverflow.com/questions/4884839/how-do-i-get-an-element-to-scroll-into-view-using-jquery
                var offset = $(totalDiv).offset();
                offset.left -= 50;
                offset.top -= 50;
                $('html, body').animate({
                    scrollTop: offset.top,
                    scrollLeft: offset.left
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                var XML = $(jqXHR.responseText);
                alert("error in querying for TOC");
                console.log("error: " + textStatus + "\n" + errorThrown);
            }
        }); //ajax ends       
    });
});