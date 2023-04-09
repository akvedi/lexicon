async function getStorage(){
    let storageItem = await browser.storage.local.get();
    document.querySelector("#total-words-stored").innerText = storageItem.definitions.length || 0;
    document.querySelector("#longest-words").innerText = storageItem.longestWord || "";


}

getStorage();