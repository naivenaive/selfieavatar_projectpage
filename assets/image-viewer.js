(() => {
    const dialog = document.createElement('dialog');
    dialog.className = 'image-viewer';
    dialog.setAttribute('aria-labelledby', 'image-viewer-title');
    dialog.innerHTML = `<div class="image-viewer-toolbar"><h2 class="image-viewer-title" id="image-viewer-title">Image preview</h2><button type="button" data-action="out" aria-label="Zoom out">−</button><button type="button" data-action="in" aria-label="Zoom in">+</button><button type="button" data-action="fit" aria-label="Fit image to screen">Fit</button><button type="button" data-action="close" aria-label="Close image preview" autofocus>×</button></div><div class="image-viewer-stage"><p class="image-viewer-status" role="status">Loading image…</p><div class="image-viewer-canvas"><img class="image-viewer-image" alt=""></div></div>`;
    document.body.append(dialog);
    const image = dialog.querySelector('img');
    const stage = dialog.querySelector('.image-viewer-stage');
    const canvas = dialog.querySelector('.image-viewer-canvas');
    const status = dialog.querySelector('.image-viewer-status');
    let scale = 1, opener = null, previousOverflow = '';
    function sizeImage() {
        if (!dialog.open || !image.naturalWidth || !image.naturalHeight) return;
        const fit = Math.min((stage.clientWidth - 32) / image.naturalWidth, (stage.clientHeight - 32) / image.naturalHeight, 1);
        const width = image.naturalWidth * fit * scale, height = image.naturalHeight * fit * scale;
        image.style.width = width + 'px';
        image.style.height = height + 'px';
        canvas.style.width = Math.max(stage.clientWidth, width + 32) + 'px';
        canvas.style.height = Math.max(stage.clientHeight, height + 32) + 'px';
        image.style.cursor = scale === 1 ? 'zoom-in' : 'zoom-out';
        dialog.querySelector('[data-action="out"]').disabled = scale <= 1;
        dialog.querySelector('[data-action="in"]').disabled = scale >= 8;
    }
    function zoom(next) {
        const x = (stage.scrollLeft + stage.clientWidth / 2) / Math.max(1, stage.scrollWidth);
        const y = (stage.scrollTop + stage.clientHeight / 2) / Math.max(1, stage.scrollHeight);
        scale = Math.max(1, Math.min(8, next));
        sizeImage();
        stage.scrollLeft = x * stage.scrollWidth - stage.clientWidth / 2;
        stage.scrollTop = y * stage.scrollHeight - stage.clientHeight / 2;
    }
    function open(source) {
        opener = source;
        scale = 1;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        image.hidden = true;
        status.hidden = false;
        status.textContent = 'Loading image…';
        dialog.querySelector('.image-viewer-title').textContent = source.alt || 'Image preview';
        image.alt = source.alt;
        image.onload = () => { status.hidden = true; image.hidden = false; sizeImage(); stage.scrollTo(0, 0); };
        image.onerror = () => { status.textContent = 'Unable to load this image.'; };
        dialog.showModal();
        image.src = source.currentSrc || source.src;
    }
    document.querySelectorAll('.container img').forEach(source => {
        source.tabIndex = 0;
        source.setAttribute('role', 'button');
        source.setAttribute('aria-label', 'Enlarge image: ' + (source.alt || 'Image'));
        source.addEventListener('click', () => open(source));
        source.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(source); }
        });
    });
    document.querySelectorAll('.mobile-figure-link').forEach(link => link.addEventListener('click', event => {
        event.preventDefault();
        open(link.closest('figure').querySelector('img'));
    }));
    dialog.addEventListener('click', event => {
        const action = event.target.closest('button')?.dataset.action;
        if (action === 'close') dialog.close();
        else if (action === 'in') zoom(scale * 1.5);
        else if (action === 'out') zoom(scale / 1.5);
        else if (action === 'fit') zoom(1);
        else if (event.target === image) zoom(scale === 1 ? 2.5 : 1);
        else if (event.target === dialog) {
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        }
    });
    dialog.addEventListener('close', () => {
        document.body.style.overflow = previousOverflow;
        opener?.focus({ preventScroll: true });
    });
    dialog.addEventListener('keydown', event => {
        if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(scale * 1.5); }
        if (event.key === '-') { event.preventDefault(); zoom(scale / 1.5); }
    });
    window.addEventListener('resize', () => { if (dialog.open) zoom(1); });
})();
