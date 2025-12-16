const $services = document.getElementById("services");
const $creds = document.getElementById("creds");
const $username = document.getElementById("username");
const $password = document.getElementById("password");
const $details = document.getElementById("details");
const $service = document.getElementById("service");
const $result = document.getElementById("result");
const $format = document.getElementById("format");
const $copy = document.getElementById("copy");
const $reset = document.getElementById("reset");
const EMPTY_SERVICE = "(Fill in the service)";
// const $normal   = document.getElementById("normal");
// const $simple   = document.getElementById("simple");
// const $redacted = document.getElementById("redacted");

let services = JSON.parse(localStorage.getItem("services") || "{}");
let generated = null;
let format = "visible";
const formats = {
    visible: EMPTY_SERVICE,
    redactd: EMPTY_SERVICE,
    simpler: EMPTY_SERVICE,
    
};
$result.innerText = EMPTY_SERVICE;

function loadServices() {
    console.log("services", services);
    for (const name in services) {
        const el = document.createElement("li");
        el.innerHTML = `<a href="#${name}">${name}</a>`;
        el.addEventListener("click", onService);
        console.log("service", name, services[name]);
        $services.prepend(el);
    }
}


function save   (name) {
    name = name.trim();
    if (name.length < 1) {
        return;
    }

    console.log("service", name, services[name]);
    if (services[name]) {
        return;
    }

    const service = {
        name: name,
    };
    services[name] = service;
    const el = document.createElement("li");
    el.innerHTML = `<a href="#${name}">${name}</a>`;
    el.addEventListener("click", onService);
    $services.prepend(el);
    localStorage.setItem("services", JSON.stringify(services));
}

function forService(name) {
    $service.value = name;
    $service.focus();
    $service.select();
    generate();
}

function onService(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    const name = ev.target.innerText;
    $service.value = name;
    $service.focus();
    $service.select();
    // onServiceKey();
    generate();
}

function resetServices() {
    services = {};
    localStorage.setItem("services", JSON.stringify(services));
    $services.innerHTML = "";
}

function resetCreds() {
    $username.value = "";
    $password.value = "";
    $service.value = "";
    $result.innerText = EMPTY_SERVICE;

    saveCreds();
    resetServices();
    $username.focus();
    $username.select();
}

function selectFormat() {
    const els = document.getElementsByClassName("format");
    for (let i = 0; i < els.length; i++) {
        const el = els[i];
        el.classList.remove("selected");
    }

    const selected =
        format in formats
            ? document.getElementById(format)
            : document.getElementById("visible");
    selected.classList.add("selected");
}

function saveCreds() {
    const username = $username.value;
    const password = $password.value;

    if (username.length > 0 && password.length > 0) {
        // console.log("Saving creds");
        localStorage.setItem("username", username);
        localStorage.setItem("password", password);
        showCreds(false);
    } else {
        // console.log("Removing creds");
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        showCreds(true);
    }
    history.pushState({}, "", "./");

    return false;
}

function showCreds(visible) {
    if (visible) {
        // console.log("Show creds");
        $creds.style.display = "block";
        $reset.style.display = "none";
        $details.style.display = "none";
        // console.log("$username", $username);
        // $service.blur();
        // $username.focus();
        // $username.select();
        resetServices();
        return;
    }

    // console.log("Hide creds");
    $creds.style.display = "none";
    $reset.style.display = "inline-block";
    $details.style.display = "block";
    loadServices();
    $username.blur();
    $service.focus();
    $service.select();
}

function loadCreds(service) {
    const username = localStorage.getItem("username") || "";
    const password = localStorage.getItem("password") || "";
    format = localStorage.getItem("format") || "redactd";
    selectFormat();

    $username.value = username;
    $password.value = password;

    if (username.length > 0 && password.length > 0) {
        showCreds(false);
        forService(service);
    } else {
        showCreds(true);
    }
}

async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    const bytes = Array.from(new Uint8Array(buffer));
    // console.log("Data           ", data);
    // console.log("Buffer         ", buffer);
    // console.log("Bytes          ", bytes);
    // console.log("Encoded?       ", btoa(bytes));
    // console.log("Decoded?       ", buffer);
    // console.log("Hex", hex);
    // console.log("Raw", raw);
    // console.log("+++", btoa(raw));
    // const hex = bytes
    //     .map(b => b.toString(16).padStart(2, "0"))
    //     .join("");

    const raw = String.fromCharCode.apply(String, bytes);
    return raw;
}

function isKeyboardEmpty(ev) {
    return (
        ev.charCode === 0 &&
        ev.metaKey === false &&
        ev.shiftKey === false &&
        ev.ctrlKey === false
    );
}

function copyPassword() {
    history.pushState({}, "", "./?service=" + encodeURIComponent($service.value));
    let value = formats[format];
    if (format === "redactd") {
        value = formats["visible"];
    }

    $service.select();
    if (value === EMPTY_SERVICE) {
        return false;
    }

    navigator.clipboard.writeText(value);
    $result.innerText = "Password copied";
    $result.classList.add("new");
    setTimeout(() => {
        $result.classList.remove("new");
        $result.innerText = formats[format];
    }, 2000);
}

function setValue(value) {
    generated = value;

    if (value.length < 1) {
        formats["visible"] = EMPTY_SERVICE;
        formats["simpler"] = EMPTY_SERVICE;
        formats["redactd"] = EMPTY_SERVICE;
        return;
    }

    // TODO: The generated value has 43 chars, but this uses only 36
    // (6 x 6) char. So we adjust the `redacted` to use the `visible`
    // instead.
    const chunks = 6;
    const length = 6;
    let parts = [];
    for (let i = 0; i < chunks; i++) {
        parts.push(value.slice(i * length, (i + 1) * length));
    }

    const visible = parts.join("-");
    const simpler =
        value.slice(0, 4) + "+" + value.slice(4, 8) + "-" + value.slice(8, 12);
    const redactd =
        visible.slice(0, 2) +
        "****-******-******-******-******-****" +
        visible.slice(-2);

    formats["visible"] = visible;
    formats["redactd"] = redactd;
    formats["simpler"] = correct(simpler);

    $result.innerText = formats[format];
}

// function onKeyDown(ev) {
//     if (ev.keyCode === 18 && isKeyboardEmpty(ev)) {
//         return toggle(true);
//     }
// }

function correct(value) {
    const CHARS_SYMBOLS = "-+";
    const CHARS_NUMBERS = "0123456789";
    const CHARS_LOWERS = "abcdefghijklmnopqrstuvwxyz!";
    const CHARS_UPPERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!";

    let hasSymbol = false;
    let hasNumber = false;
    let hasLower = false;
    let hasUpper = false;

    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        const isSymbol = CHARS_SYMBOLS.indexOf(char) > -1;
        const isNumber = CHARS_NUMBERS.indexOf(char) > -1;
        const isLower = CHARS_LOWERS.indexOf(char) > -1;
        const isUpper = CHARS_UPPERS.indexOf(char) > -1;

        hasSymbol = isSymbol || hasSymbol;
        hasNumber = isNumber || hasNumber;
        hasLower = isLower || hasLower;
        hasUpper = isUpper || hasUpper;
    }

    // console.log("Fixing symbol");
    if (hasSymbol === false) value = replace(value, CHARS_SYMBOLS, -4);
    if (hasNumber === false) value = replace(value, CHARS_NUMBERS, -3);
    if (hasLower === false) value = replace(value, CHARS_LOWERS, -2);
    if (hasUpper === false) value = replace(value, CHARS_UPPERS, -1);

    return value;
}

function replace(value, chars, position) {
    const index = value.length + position;
    const code = value.charCodeAt(index);
    const rand = Math.floor(code % chars.length);

    return value.substring(0, index) + chars[rand] + value.substring(index + 1);
}

function generate() {
    if ($service.value === "") {
        setValue("");
        return;
    }

    const source = [
        $username.value.toLowerCase(),
        // username.value,
        $password.value,
        $service.value.toLowerCase(),
        // service.value,
        0,
    ].join(":");

    sha256(source)
        .then((raw) => {
            const encoded = btoa(raw);
            const regex = /[^0-9A-Za-z]/g;
            const clean = encoded.replace(regex, "");
            // console.log("Source   ", source);
            // console.log("Raw      ", raw);
            // console.log("Encoded  ", encoded);
            // console.log("Clean    ", clean);
            setValue(clean);
        })
        .catch((err) => {
            console.error("err", err);
        });
}

function showFormat() {
    selectFormat();
    localStorage.setItem("format", format);
    $result.innerText = formats[format];
}

function nextFormat() {
    switch (format) {
        case "visible":
            format = "redactd";
            break;
        case "redactd":
            format = "simpler";
            break;
        case "simpler":
            format = "visible";
            break;
    }

    showFormat();
    // selectFormat();
    // localStorage.setItem("format", format);
    // $result.innerText = formats[format];
}

function stopIt(ev) {
    ev.stopPropagation();
    ev.preventDefault();
}

$username.onkeydown = (ev) => {
    if (ev.key === "Enter" && isKeyboardEmpty(ev)) {
        stopIt(ev);
        saveCreds();
        return false;
    }
};

$password.onkeydown = (ev) => {
    if (ev.key === "Enter" && isKeyboardEmpty(ev)) {
        stopIt(ev);
        saveCreds();
        return false;
    }
};

$creds.onsubmit = (ev) => {
    stopIt(ev);
    saveCreds();
    return false;
};

$reset.onclick = (ev) => {
    stopIt(ev);
    resetCreds();
    return false;
};

$format.onclick = (ev) => {
    stopIt(ev);
    nextFormat();
    return false;
};

$copy.onclick = (ev) => {
    stopIt(ev);
    copyPassword();
    return false;
};

function onServiceKey() {
    copyPassword();
    saveService($service.value);
}

const buttons = document.getElementsByClassName("format");
// console.log("buttons", buttons);
// console.log("buttons[0]", buttons[0]);
for (let el of buttons) {
    console.log("el", el);
    el.addEventListener("click", (ev) => {
        stopIt(ev);
        const value = ev.target.id;
        format = value;
        console.log("format", value, format);
        showFormat();
    });
}

$service.onkeyup = (ev) => {
    if (ev.key === "Enter" && isKeyboardEmpty(ev)) {
        console.log("Enter");
        stopIt(ev);
        // copyPassword();
        // saveService($service.value);
        onServiceKey();
        return false;
    }

    if (ev.key === "Alt" && isKeyboardEmpty(ev)) {
        stopIt(ev);
        nextFormat();
        return false;
    }

    generate();
};

document.onkeyup = (ev) => {
    if (ev.key === "Enter" && isKeyboardEmpty(ev)) {
        console.log("Enter");
        stopIt(ev);
        copyPassword();
        console.log("$service.value", $service.value);
        return false;
    }

    if (ev.key === "Alt" && isKeyboardEmpty(ev)) {
        stopIt(ev);
        nextFormat();
        return false;
    }

    console.log("What's this?", {
        key: ev.key,
        altKey: ev.altKey,
        charCode: ev.charCode,
        metaKey: ev.metaKey,
        shiftKey: ev.shiftKey,
        ctrlKey: ev.ctrlKey,
    });
};

const search = new URLSearchParams(location.search);
const service = search.get("service");
loadCreds(service);
