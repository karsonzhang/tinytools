$(function () {
    var st;
    var url;
    var rebuild = function () {
        var type = $("input[name=type]:checked").val();
        var mode = $("#mode option:selected").val();
        var inputobj = $("#inputtext");
        var inputtext = $("#inputtext").val();
        var outputobj = $("#outputtext");
        var result = "";
        try {
            switch (type) {
                case "qrcode":
                    inputtext = inputtext.length == 0 && url.length > 0 ? url : inputtext;
                    outputobj.hide();
                    $("#qrcode").html('');
                    $("#qrcode").qrcode({
                        "render": "image",
                        "size": 200,
                        "color": "#3a3",
                        "text": utf8text(inputtext)
                    });
                    break;
                case "url":
                    if (mode == 'auto') {
                        if (inputtext.match(/^[0-9a-zA-Z\-_\*%\.]+$/)) {
                            mode = 'urldecode';
                        } else {
                            mode = 'urlencode';
                        }
                    }
                    result = mode == 'urlencode' ? encodeURIComponent(inputtext) : decodeURIComponent(inputtext);
                    break;
                case "unicode":
                    if (mode == 'auto') {
                        if (inputtext.match(/^\\u[0-9a-fA-F]{4}(.*)/)) {
                            mode = 'unidecode';
                        } else {
                            mode = 'uniencode';
                        }
                    }
                    result = mode == 'uniencode' ? $.endecode.uniEncode(inputtext) : $.endecode.uniDecode(inputtext);
                    break;
                case "timestamp":
                    if (inputtext.length == 0 || inputtext.match(/^[0-9]{10,}$/)) {
                        var timeobj;
                        if (inputtext.length == 0) {
                            timeobj = new Date();
                        } else if (inputtext.length == 10) {
                            timeobj = new Date(parseInt(inputtext) * 1000);
                        } else {
                            timeobj = new Date(parseFloat(inputtext));
                        }
                        if (inputtext.length == 0) {
                            inputobj.val(parseInt(timeobj.getTime() / 1000));
                        }
                        var year = timeobj.getFullYear();
                        var month = timeobj.getMonth() + 1;
                        var day = timeobj.getDate();
                        var hours = timeobj.getHours();
                        var minutes = timeobj.getMinutes();
                        var seconds = timeobj.getSeconds();
                        month = month < 10 ? "0" + month : month;
                        day = day < 10 ? "0" + day : day;
                        hours = hours < 10 ? "0" + hours : hours;
                        minutes = minutes < 10 ? "0" + minutes : minutes;
                        seconds = seconds < 10 ? "0" + seconds : seconds;
                        result += year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
                    } else if (inputtext.match(/^[0-9]{4}\-[0-9]{1,2}\-[0-9]{1,2}\s[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}$/)) {
                        var timeobj = inputtext.replace(/(:|\s)/g, "-").split("-");
                        result = parseInt(new Date(Date.UTC(timeobj[0], timeobj[1] - 1, timeobj[2], timeobj[3] - 8, timeobj[4], timeobj[5])).getTime() / 1000);
                    } else {
                        result = "Invalid format";
                    }
                    break;
                case "base64":
                    if (mode == 'auto') {
                        if (inputtext.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/)) {
                            mode = 'base64decode';
                        } else {
                            mode = 'base64encode';
                        }
                    }
                    result = mode == 'base64encode' ? $.endecode.base64Encode($.endecode.utf8Encode(inputtext)) : $.endecode.utf8Decode($.endecode.base64Decode(inputtext));
                    break;
                case "translate":
                    if (inputtext.length > 0) {
                        clearTimeout(st);
                        st = setTimeout(function () {
                            var from = "auto";
                            var to = "en";
                            if (mode !== 'auto') {
                                var arr = mode.split('-');
                                from = arr[0];
                                to = arr[1];
                            }
                            if (inputtext.match(/^[a-zA-Z\s]+$/)) {
                                from = "en";
                                to = "zh";
                            }
                            $.ajax({
                                url: "http://apistore.baidu.com/microservice/translate",
                                data: {query: inputtext, from: from, to: to},
                                dataType: 'json',
                                success: function (ret) {
                                    result = ret.retData.trans_result[0].dst;
                                    outputobj.val(result);
                                }, error: function (ret) {
                                    result = "unknown format";
                                }
                            });
                        }, 250);
                    }
                    break;
                default:
                    break;
            }
        } catch (exception) {
            result = "An error occurred";
        }
        outputobj.val(result);
    };

    if ($('[data-toggle="select"]').length) {
        $('[data-toggle="select"]').select2();
    }
    $("#exchange").on("click", function () {
        $("#inputtext").val($("#outputtext").val());
        rebuild();
    });
    $("#inputtext").bind("input propertychange", function () {
        rebuild();
    });
    $("input[name=type]").on("click", function () {
        $("#mode").select2('data', []);
        $("#mode option").remove();
        var selectlist = $(this).data("select");
        $(selectlist.split("|")).each(function (i, j) {
            $("<option value='" + j + "'>" + j + "</option>").appendTo($("#mode"));
        });
        $("#mode").select2('val', 'auto');
        if ($(this).val() == "qrcode") {
            $("#outputtext").hide();
            $("#qrcode").show();
        } else {
            $("#outputtext").show();
            $("#qrcode").hide();
        }
        rebuild();
    });
    $("#truncate").on("click", function () {
        $("#inputtext").val('').focus();
        rebuild();
    });
    $("#copy").on("click", function () {
        copy($("#outputtext").val());
    });
    $("#mode").change(function () {
        rebuild();
    });
    var pastetext = paste();
    $("#inputtext").val(pastetext).focus();
    if (pastetext.match(/^[0-9]{10,}$/) || pastetext.match(/^[0-9]{4}\-[0-9]{1,2}\-[0-9]{1,2}\s[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}$/)) {
        $("input[name=type][value=timestamp]").attr("checked", "checked");
    }
    rebuild();
    chrome.tabs.query({
        currentWindow: true,
        active: true
    },
    function (tab) {
        url = tab[0].url;
        if ($("input[name=type]:checked").val() == "qrcode" && ($.trim(pastetext).length == 0 || !pastetext.match(/^[a-zA-Z0-9]{6}$/)) && !pastetext.match(/^((https|http|ftp)?:\/\/)(.*)/)) {
            pastetext = url;
            $("#inputtext").val(pastetext).focus();
            rebuild();
        }
    });
});