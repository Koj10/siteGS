function getProductImageUrl(type, id) {
    return `${getApiBase()}/images/${type}/${id}`;
}

function attachCardImage(img, type, id, options = {}) {
    const maxRetries = options.retries ?? 3;
    const wrap = img.closest('.card-image-wrap');
    let attempt = 0;
    let loadId = 0;

    const markLoaded = () => {
        img.classList.add('is-loaded');
        if (wrap) {
            wrap.classList.remove('is-loading', 'is-error');
            wrap.classList.add('is-loaded');
            wrap.removeAttribute('title');
            wrap.style.cursor = '';
            wrap.onclick = null;
        }
    };

    const markError = () => {
        if (!wrap) return;

        wrap.classList.remove('is-loading');
        wrap.classList.add('is-error');
        wrap.title = 'Нажмите, чтобы повторить загрузку';
        wrap.style.cursor = 'pointer';
        wrap.onclick = () => {
            wrap.onclick = null;
            wrap.classList.remove('is-error');
            attempt = 0;
            load();
        };
    };

    const load = () => {
        const currentLoad = ++loadId;

        if (wrap) {
            wrap.classList.add('is-loading');
            wrap.classList.remove('is-loaded');
        }
        img.classList.remove('is-loaded');

        const cacheBust = attempt > 0 ? `?retry=${attempt}&t=${Date.now()}` : '';
        img.src = `${getProductImageUrl(type, id)}${cacheBust}`;

        img.onload = () => {
            if (currentLoad !== loadId) return;
            markLoaded();
        };
        img.onerror = () => {
            if (currentLoad !== loadId) return;
            attempt += 1;
            if (attempt <= maxRetries) {
                window.setTimeout(load, 350 * attempt);
            } else {
                markError();
            }
        };
    };

    if (img.complete && img.naturalWidth > 0) {
        markLoaded();
        return;
    }

    load();
}
