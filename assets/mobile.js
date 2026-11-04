/* Phone interaction layer. No DOM changes are made on desktop. */
(() => {
    const phone = window.matchMedia('(max-width: 768px)');
    // Reload only when crossing the phone/desktop breakpoint, so the correct
    // interaction layer also applies after rotating a tablet or resizing a window.
    phone.addEventListener('change', () => window.location.reload());
    if (!phone.matches) return;

    let comparisonVideos = [];
    let comparisonVisible = false;
    const automaticPreviews = new Set([...document.querySelectorAll('#part1 .media-card, #part2 .media-card, #part4 .media-card, #part5 .media-card')]
        .filter(card => ['Ours', 'Result'].includes(card.querySelector('.media-label')?.textContent.trim()))
        .map(card => card.querySelector('video')).filter(Boolean));
    const visiblePreviews = new Set();
    const videos = [...document.querySelectorAll('video')];
    videos.forEach(video => {
        video.pause();
        video.preload = 'none';
        video.controls = true;
        video.playsInline = true;
        video.addEventListener('play', () => {
            // Automatic result previews and the selected comparison may play together.
            // A manual baseline video only replaces another manual baseline video.
            if (automaticPreviews.has(video) || comparisonVideos.includes(video)) return;
            videos.forEach(other => {
                if (other !== video && !automaticPreviews.has(other) && !comparisonVideos.includes(other)) other.pause();
            });
        });
    });
    const visibility = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) {
                if (target.preload === 'none') target.preload = 'metadata';
                if (automaticPreviews.has(target)) {
                    visiblePreviews.add(target);
                    if (!document.hidden) target.play().catch(() => {});
                }
            } else {
                visiblePreviews.delete(target);
                if (!comparisonVideos.includes(target)) target.pause();
            }
        });
    }, { rootMargin: '100px', threshold: 0 });
    videos.forEach(video => visibility.observe(video));
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) videos.forEach(video => video.pause());
        else {
            visiblePreviews.forEach(video => video.play().catch(() => {}));
            if (comparisonVisible) playComparison();
        }
    });

    window.switchTab = tabName => {
        document.querySelectorAll('#part1 video').forEach(video => video.pause());
        document.querySelectorAll('#part1 .tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });
        document.querySelectorAll('#part1 .tab-btn').forEach(button => {
            const active = (button.getAttribute('onclick') || '').includes("'" + tabName + "'");
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
    };
    document.querySelectorAll('.app-demo-dots .dot').forEach(dot => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = dot.className;
        button.dataset.index = dot.dataset.index;
        button.setAttribute('aria-label', 'Show app demo ' + (Number(dot.dataset.index) + 1));
        button.setAttribute('aria-pressed', String(dot.classList.contains('active')));
        button.addEventListener('click', () => {
            document.querySelectorAll('.app-demo-dots .dot').forEach(other => {
                const active = other === button;
                other.classList.toggle('active', active);
                other.setAttribute('aria-pressed', String(active));
            });
            document.querySelectorAll('.app-demo-item').forEach(item => {
                item.querySelector('video').pause();
                item.classList.toggle('active', item.dataset.index === button.dataset.index);
            });
        });
        dot.replaceWith(button);
    });

    // The same 25 results remain available, selected by reference and driver.
    const table = document.querySelector('#part6 .table-grid');
    const cells = [...table.children];
    const drivers = cells.slice(1, 6);
    const rows = [];
    for (let i = 6; i < cells.length; i += 6) rows.push(cells.slice(i, i + 6));
    const filters = document.createElement('div');
    filters.className = 'mobile-video-filters';
    function selectField(labelText, options) {
        const label = document.createElement('label');
        label.append(labelText);
        const select = document.createElement('select');
        options.forEach((text, index) => select.add(new Option(text, String(index))));
        label.append(select);
        filters.append(label);
        return select;
    }
    const reference = selectField('Reference identity', rows.map((_, i) => 'Person ' + (i + 1)));
    const driver = selectField('Driving video', ['Shout & laugh', 'Speech', 'Cheeks & nose', 'Mouth motion', 'Tongue motion']);
    table.before(filters);
    let comparisonRequested = false;
    function playComparison() {
        comparisonVideos.forEach(video => {
            video.muted = true;
            video.play().catch(() => {});
        });
    }
    function showResult(autoplay = false) {
        table.querySelectorAll('video').forEach(video => video.pause());
        cells.forEach(cell => cell.classList.remove('mobile-selected'));
        const selected = rows[Number(reference.value)];
        const driverCell = drivers[Number(driver.value)];
        const resultCell = selected[Number(driver.value) + 1];
        [selected[0], driverCell, resultCell].forEach(cell => cell.classList.add('mobile-selected'));
        comparisonVideos = [...driverCell.querySelectorAll('video'), ...resultCell.querySelectorAll('video')];
        comparisonRequested = true;
        comparisonVideos.forEach(video => { video.currentTime = 0; });
        if (autoplay) playComparison();
    }
    reference.addEventListener('change', () => showResult(true));
    driver.addEventListener('change', () => showResult(true));
    showResult();
    // Keep the whole selected comparison playing while its section is visible,
    // even when a lower result lies just below the phone's viewport.
    const comparisonVisibility = new IntersectionObserver(entries => {
        comparisonVisible = entries[0].isIntersecting;
        if (comparisonVisible) {
            if (comparisonRequested && !document.hidden) playComparison();
        } else comparisonVideos.forEach(video => video.pause());
    });
    comparisonVisibility.observe(table);

    const nav = document.createElement('nav');
    nav.className = 'mobile-section-nav';
    nav.setAttribute('aria-label', 'Page sections');
    for (const [id, text] of [['teaser', 'Overview'], ['method', 'Method'], ['part1', 'Reconstruction'], ['part2', 'Selfies'], ['part3', 'App demo'], ['part4', 'Self reenactment'], ['part5', 'Cross reenactment'], ['part6', 'Video reenactment']]) {
        const link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = text;
        nav.append(link);
    }
    document.querySelector('.hero-section').after(nav);
    document.querySelectorAll('.overview-figure').forEach(figure => {
        const link = document.createElement('a');
        link.className = 'mobile-figure-link';
        link.href = figure.querySelector('img').getAttribute('src');
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'View full-size image ↗';
        figure.querySelector('img').after(link);
    });
    for (const id of ['part1', 'part4', 'part5', 'part6']) {
        const section = document.getElementById(id);
        section.querySelectorAll(':scope > p').forEach(p => {
            p.textContent = p.textContent.replace('👇Hover over the video to play.', 'Our results play automatically. Tap other videos to play, and swipe to compare more methods.').replace('👇Hover over the video to show comparison results.', 'Choose a reference and driving video below. The driving video and all available results play together after switching.');
        });
    }
})();
