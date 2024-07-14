
(async ()=>{
    let storageItem = await browser.storage.local.get();
    upadtePopup(storageItem);
    loadTheme(storageItem.theme);
    
})();


function upadtePopup(obj){
    document.querySelector("#total-words-stored").innerText = obj.totalWords || 0;
    document.querySelector("#longest-words").innerText = obj.longestWord || "---";
}

function loadTheme(theme){
    if(theme == 'dark' || (theme == 'system' && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")).matches)
        return document.querySelector('body').id = 'dark';

    return document.querySelector('body').id = 'light';
}

