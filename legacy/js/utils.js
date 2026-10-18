function createId(prefix) {
    const random = window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${random}`;
}

function cleanLink(value) {
    if (!value || value === "#") return "";
    if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
    return `https://${value}`;
}

function slugify(value) {
    const slug = String(value || "library")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "library";
}

function formatCount(visible, total) {
    const label = total === 1 ? "card" : "cards";
    if (visible === total) {
        return `${total} ${label}`;
    }
    return `${visible} of ${total} ${label}`;
}

function formatLibraryCount(visible, total) {
    const label = total === 1 ? "library" : "libraries";
    if (visible === total) {
        return `${total} ${label}`;
    }
    return `${visible} of ${total} ${label}`;
}

function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2400);
}
