if (location.href.indexOf("tool.manmanbuy.com/") > 0) {
    setTimeout(() => {
        if (document.getElementsByClassName("bigwordprice")[0] == undefined) {
            document.getElementById("searchHistory").click();
        }
    }, 500);
} else {
    na = document.createElement("div");
    na.innerHTML = "<div id='xxusexsh0w' style='position:fixed;bottom:5%;left:5px;width:60px;height:60px;border:grey solid 1px;background-color:rgb(249,81,59);'><font id='xxxusexcl0se' style='font-size:larger;margin:1px;position:absolute;right:1px;top:1px;'>X</font><font style='line-height:60px;font-size:12px;color:#fff;'>前往慢慢买</font></div>"
    this.document.body.appendChild(na);
    document.getElementById("xxusexsh0w").onclick = function () {
        window.open("http://tool.manmanbuy.com/historyLowest.aspx?url=" + location.href.replace(/&/g, "%26").replace(/\?/g, "%3F").replace(/=/g, "%3D").replace(/ /g, ""))
    }
    document.getElementById("xxxusexcl0se").onclick = function () {
        event.stopPropagation();
        document.getElementById("xxusexsh0w").style.visibility = "hidden";
    }
}